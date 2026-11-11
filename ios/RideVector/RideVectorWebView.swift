import SwiftUI
import WebKit

struct RideVectorWebView: UIViewRepresentable {
    @ObservedObject var model: CompanionModel
    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(model, name: "ridevectorHealth")
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = model
        view.allowsBackForwardNavigationGestures = true
        model.webView = view
        view.load(URLRequest(url: URL(string: "https://ridevector.app")!))
        return view
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    static func dismantleUIView(_ uiView: WKWebView, coordinator: ()) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "ridevectorHealth")
        uiView.navigationDelegate = nil
    }
}
