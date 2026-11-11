import Foundation
import Combine
import HealthKit
import WebKit
import UIKit

@MainActor
final class CompanionModel: NSObject, ObservableObject, WKScriptMessageHandler, WKNavigationDelegate {
    @Published var busy = false
    @Published var pageReady = false
    @Published var status = "Sign in above, then import your cycling workouts. Health access is read-only."
    weak var webView: WKWebView?
    private let health = HealthImporter()

    func importHealth() async {
        guard !busy, let webView, webView.url?.host == "ridevector.app", webView.url?.scheme == "https" else { return }
        busy = true
        defer { busy = false }
        do {
            let accountID = try await webView.evaluateJavaScript("window.ridevectorCompanionAccountID || ''") as? String ?? ""
            guard !accountID.isEmpty else { status = "Sign in to RideVector above before importing Apple Health."; return }
            status = "Requesting permission for cycling workouts and available recordings…"
            try await health.authorize()
            let rides = try await health.rides()
            guard !rides.isEmpty else {
                status = "No cycling workouts were shared from the last 90 days. Check Health → Sharing → Apps → RideVector."
                return
            }
            let data = try JSONSerialization.data(withJSONObject: ["owner": accountID, "items": rides])
            let encoded = data.base64EncodedString()
            // JSON goes through a base64 literal, never executable workout text.
            let script = "window.dispatchEvent(new CustomEvent('ridevector-health-import',{detail:JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('\(encoded)'),c=>c.charCodeAt(0))))}));"
            status = "Saving \(rides.count) cycling workouts to your private dashboard…"
            try await webView.evaluateJavaScript(script)
            // The web handler sends the final result after its authenticated saves finish.
            let started = Date()
            while status.hasPrefix("Saving ") && Date().timeIntervalSince(started) < 180 {
                try await Task.sleep(for: .milliseconds(250))
            }
            if status.hasPrefix("Saving ") { status = "The import is taking longer than expected. Check the dashboard before retrying; duplicate imports are safe." }
        } catch {
            status = "Import could not finish: \(error.localizedDescription)"
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "ridevectorHealth", message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == "ridevector.app",
              let result = message.body as? [String: Any], let text = result["message"] as? String else { return }
        status = text
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pageReady = webView.url?.host == "ridevector.app"
    }
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { pageReady = false }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        status = "Could not load RideVector: \(error.localizedDescription)"
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, url.scheme == "https" else { decisionHandler(.cancel); return }
        if url.host == "ridevector.app" {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
            // OAuth and other links stay in the system browser, outside the Health bridge.
            UIApplication.shared.open(url)
        }
    }
}
