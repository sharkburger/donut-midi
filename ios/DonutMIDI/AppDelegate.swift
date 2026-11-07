import UIKit
import WebKit
import UniformTypeIdentifiers

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = UINavigationController(rootViewController: InstrumentViewController())
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

final class InstrumentViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, UIDocumentPickerDelegate {
    private var webView: WKWebView!
    private var pendingExport: URL?
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Donut MIDI · Beta"
        view.backgroundColor = UIColor(red: 0.98, green: 0.96, blue: 0.94, alpha: 1)
        navigationItem.leftBarButtonItem = UIBarButtonItem(title: "Import Recording", style: .plain, target: self, action: #selector(importRecording))
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Help", style: .plain, target: self, action: #selector(showHelp))
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self, name: "exportRecording")
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        guard let root = Bundle.main.resourceURL?.appendingPathComponent("web"), FileManager.default.fileExists(atPath: root.appendingPathComponent("index.html").path) else {
            showError("Offline resources are missing. Please reinstall the beta.")
            return
        }
        webView.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
        NotificationCenter.default.addObserver(self, selector: #selector(stopAudio), name: UIApplication.willResignActiveNotification, object: nil)
    }
    @objc private func stopAudio() {
        webView?.evaluateJavaScript("document.getElementById('panicMusic')?.click();if(typeof instrument!=='undefined'){instrument.stop();}if(typeof replayPlaying!=='undefined'){replayPlaying=false;updateReplayButton();}", completionHandler: nil)
    }
    @objc private func showHelp() {
        let alert = UIAlertController(title: "Touch and Replay Beta", message: "1. Tap Enable sound & play.\n2. Hold a donut for about half a second to play a note. Lift your finger and touch again to retrigger.\n3. Choose Replay data under Input source to play the synthetic demo, or use Import Recording to load JSON.\n4. To record simulated input, enable recording consent, start and stop the recording, then tap Export JSON and save it through the system share sheet.\n\nThis beta supports eight-key touch performance and replay. Live Neon, the participant database, external MIDI and Workshop Editor are unavailable. It does not use the camera or measure pupils. Recordings stay in memory until exported; export before closing the app.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Got It", style: .default))
        present(alert, animated: true)
    }
    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Unable to Complete Action", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    @objc private func importRecording() {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json], asCopy: true)
        picker.delegate = self
        present(picker, animated: true)
    }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first else { return }
        do {
            let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size <= 100 * 1024 * 1024 else { showError("The file exceeds 100 MB."); return }
            let text = try String(contentsOf: url, encoding: .utf8)
            // JSON serialization quotes arbitrary file content safely for JavaScript.
            let arguments = try JSONSerialization.data(withJSONObject: [text, url.lastPathComponent])
            guard let json = String(data: arguments, encoding: .utf8) else { return }
            webView.evaluateJavaScript("window.donutImportRecording(...\(json))") { [weak self] _, error in
                if let error = error { self?.showError(error.localizedDescription) }
            }
        } catch { showError(error.localizedDescription) }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.name == "exportRecording", let text = message.body as? String, let data = text.data(using: .utf8), data.count <= 100 * 1024 * 1024 else { return }
        do {
            _ = try JSONSerialization.jsonObject(with: data)
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("donut-song-\(UUID().uuidString).json")
            try data.write(to: url, options: [.atomic, .completeFileProtection])
            pendingExport = url
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            sheet.popoverPresentationController?.barButtonItem = navigationItem.rightBarButtonItem
            sheet.completionWithItemsHandler = { [weak self] _, _, _, _ in
                try? FileManager.default.removeItem(at: url)
                self?.pendingExport = nil
            }
            present(sheet, animated: true)
        } catch { showError(error.localizedDescription) }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.isFileURL || url.absoluteString == "about:blank" { decisionHandler(.allow); return }
        decisionHandler(.cancel)
        if ["https", "http"].contains(url.scheme ?? ""), navigationAction.navigationType == .linkActivated {
            UIApplication.shared.open(url)
        }
    }
}
