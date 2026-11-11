import SwiftUI

@main
struct RideVectorApp: App {
    @StateObject private var companion = CompanionModel()
    var body: some Scene {
        WindowGroup {
            RideVectorWebView(model: companion)
                .safeAreaInset(edge: .bottom) {
                    VStack(spacing: 8) {
                        Button {
                            Task { await companion.importHealth() }
                        } label: {
                            HStack {
                                if companion.busy { ProgressView() }
                                Text(companion.busy ? "Importing rides…" : "Import Apple Health · last 90 days")
                            }.frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(companion.busy || !companion.pageReady)
                        Text(companion.status)
                            .font(.caption).foregroundStyle(.secondary)
                            .accessibilityLabel(companion.status)
                    }.padding().background(.regularMaterial)
                }
        }
    }
}
