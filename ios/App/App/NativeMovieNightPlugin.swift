import UIKit
import Capacitor

/// A native, offline-first movie-night workflow for iOS and iPadOS.
///
/// The web catalog remains the broad discovery surface, while this screen gives
/// the app a useful native experience that works without an account or network.
@objc(NativeMovieNightPlugin)
public final class NativeMovieNightPlugin: CAPInstancePlugin, CAPBridgedPlugin {
    public let identifier = "NativeMovieNightPlugin"
    public let jsName = "NativeMovieNight"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise)
    ]

    @objc func present(_ call: CAPPluginCall) {
        guard let presentingViewController = bridge?.viewController else {
            call.reject("The StreamFlicker window is not ready")
            return
        }

        DispatchQueue.main.async { [weak presentingViewController] in
            guard let presentingViewController else {
                call.reject("The StreamFlicker window is not ready")
                return
            }

            if presentingViewController.presentedViewController != nil {
                call.reject("A StreamFlicker screen is already open")
                return
            }

            let movieNightViewController = NativeMovieNightViewController()
            let navigationController = UINavigationController(rootViewController: movieNightViewController)
            navigationController.modalPresentationStyle = .pageSheet
            if let sheet = navigationController.sheetPresentationController {
                sheet.detents = [.medium(), .large()]
                sheet.prefersGrabberVisible = true
                sheet.preferredCornerRadius = 24
            }
            presentingViewController.present(navigationController, animated: true) {
                call.resolve()
            }
        }
    }
}

private final class NativeMovieNightViewController: UIViewController {
    private let catalog = NativeValidatedCatalog.records

    private let defaults = UserDefaults.standard
    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private let occasionControl = UISegmentedControl(items: ["Any", "Family", "Date", "Friends", "Solo"])
    private let runtimeControl = UISegmentedControl(items: ["Any", "< 100m", "100–130m", "130m+"])
    private let genreControl = UISegmentedControl(items: ["Any", "Action", "Comedy", "Family", "Horror", "Sci-Fi"])
    private let recommendationsStack = UIStackView()
    private let resultCountLabel = UILabel()
    private let savedPlanLabel = UILabel()
    private var watchlist = Set<String>()
    private var recommendations: [NativeMovie] = []
    private var lastShareButton: UIButton?

    override func viewDidLoad() {
        super.viewDidLoad()

        title = "Movie Night"
        navigationItem.largeTitleDisplayMode = .always
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(close))
        view.backgroundColor = UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark
                ? UIColor(red: 0.035, green: 0.035, blue: 0.045, alpha: 1)
                : UIColor.systemGroupedBackground
        }

        watchlist = Set(defaults.stringArray(forKey: "streamflicker.nativeMovieNight.watchlist") ?? [])
        buildLayout()
        renderRecommendations()
        restoreSavedPlan()
    }

    @objc private func close() {
        dismiss(animated: true)
    }

    private func buildLayout() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.axis = .vertical
        contentStack.spacing = 18
        contentStack.isLayoutMarginsRelativeArrangement = true
        contentStack.layoutMargins = UIEdgeInsets(top: 8, left: 20, bottom: 28, right: 20)

        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            contentStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            contentStack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
        ])

        let intro = makeLabel("Find a movie everyone can agree on.", style: .title2, color: .label)
        let introDetail = makeLabel("Choose a few preferences and get a short list from the on-device catalog. Your plan and Watchlist stay available offline.", style: .subheadline, color: .secondaryLabel)
        introDetail.numberOfLines = 0
        contentStack.addArrangedSubview(intro)
        contentStack.addArrangedSubview(introDetail)

        let offlineBanner = makeBanner(text: "Offline-ready  •  No account required  •  Saved on this device", color: .systemGreen)
        contentStack.addArrangedSubview(offlineBanner)

        contentStack.addArrangedSubview(makeSectionHeader("Who is watching?", detail: "We will balance the shortlist for the occasion."))
        configureControl(occasionControl, selectedIndex: 0)
        contentStack.addArrangedSubview(occasionControl)

        contentStack.addArrangedSubview(makeSectionHeader("How much time do you have?", detail: "Runtime is based on the movie's listed duration."))
        configureControl(runtimeControl, selectedIndex: 0)
        contentStack.addArrangedSubview(runtimeControl)

        contentStack.addArrangedSubview(makeSectionHeader("Pick a vibe", detail: "Use a genre when you already know what sounds good."))
        configureControl(genreControl, selectedIndex: 0)
        contentStack.addArrangedSubview(genreControl)

        let findButton = makePrimaryButton(title: "Find my picks", action: #selector(findPicks))
        findButton.accessibilityHint = "Updates the recommendations using your selected preferences"
        contentStack.addArrangedSubview(findButton)

        resultCountLabel.font = UIFont.preferredFont(forTextStyle: .subheadline)
        resultCountLabel.textColor = .secondaryLabel
        resultCountLabel.adjustsFontForContentSizeCategory = true
        contentStack.addArrangedSubview(resultCountLabel)

        recommendationsStack.axis = .vertical
        recommendationsStack.spacing = 12
        contentStack.addArrangedSubview(recommendationsStack)

        let actionsHeader = makeSectionHeader("Your plan", detail: "Keep a shortlist for later or share it with the group.")
        contentStack.addArrangedSubview(actionsHeader)

        savedPlanLabel.font = UIFont.preferredFont(forTextStyle: .footnote)
        savedPlanLabel.textColor = .secondaryLabel
        savedPlanLabel.numberOfLines = 0
        savedPlanLabel.adjustsFontForContentSizeCategory = true
        contentStack.addArrangedSubview(savedPlanLabel)

        let saveButton = makeSecondaryButton(title: "Save movie night", action: #selector(savePlan))
        contentStack.addArrangedSubview(saveButton)

        let shareButton = makeSecondaryButton(title: "Share plan", action: #selector(sharePlan))
        shareButton.accessibilityHint = "Opens the iOS share sheet for Messages, Mail, and AirDrop"
        lastShareButton = shareButton
        contentStack.addArrangedSubview(shareButton)

        let footer = makeLabel("Availability can change by region. Use a title card in StreamFlicker to check current services before you press play.", style: .footnote, color: .tertiaryLabel)
        footer.numberOfLines = 0
        contentStack.addArrangedSubview(footer)
    }

    private func configureControl(_ control: UISegmentedControl, selectedIndex: Int) {
        control.selectedSegmentIndex = selectedIndex
        control.apportionsSegmentWidthsByContent = true
        control.setContentHuggingPriority(.required, for: .vertical)
        control.setContentCompressionResistancePriority(.required, for: .vertical)
        control.addTarget(self, action: #selector(preferenceChanged), for: .valueChanged)
        control.accessibilityTraits = .allowsDirectInteraction
    }

    private func makeSectionHeader(_ title: String, detail: String) -> UIStackView {
        let titleLabel = makeLabel(title, style: .headline, color: .label)
        let detailLabel = makeLabel(detail, style: .footnote, color: .secondaryLabel)
        detailLabel.numberOfLines = 0
        let stack = UIStackView(arrangedSubviews: [titleLabel, detailLabel])
        stack.axis = .vertical
        stack.spacing = 3
        return stack
    }

    private func makeBanner(text: String, color: UIColor) -> UIView {
        let label = makeLabel(text, style: .footnote, color: color)
        label.numberOfLines = 0
        let container = UIView()
        container.backgroundColor = color.withAlphaComponent(0.12)
        container.layer.cornerRadius = 12
        container.layer.borderWidth = 1
        container.layer.borderColor = color.withAlphaComponent(0.28).cgColor
        container.addSubview(label)
        label.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: container.topAnchor, constant: 11),
            label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 12),
            label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -12),
            label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -11),
        ])
        return container
    }

    private func makeLabel(_ text: String, style: UIFont.TextStyle, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = UIFont.preferredFont(forTextStyle: style)
        label.textColor = color
        label.adjustsFontForContentSizeCategory = true
        return label
    }

    private func checkedLabel(_ date: String?) -> String {
        guard let date, !date.isEmpty else { return "checked date unavailable" }
        return "checked \(date)"
    }

    private func makePrimaryButton(title: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = UIFont.preferredFont(forTextStyle: .headline)
        button.backgroundColor = .systemPink
        button.layer.cornerRadius = 14
        button.contentEdgeInsets = UIEdgeInsets(top: 15, left: 18, bottom: 15, right: 18)
        button.addTarget(self, action: action, for: .touchUpInside)
        button.accessibilityTraits = .button
        return button
    }

    private func makeSecondaryButton(title: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(.systemPink, for: .normal)
        button.titleLabel?.font = UIFont.preferredFont(forTextStyle: .headline)
        button.backgroundColor = .systemPink.withAlphaComponent(0.12)
        button.layer.cornerRadius = 14
        button.layer.borderWidth = 1
        button.layer.borderColor = UIColor.systemPink.withAlphaComponent(0.35).cgColor
        button.contentEdgeInsets = UIEdgeInsets(top: 14, left: 18, bottom: 14, right: 18)
        button.addTarget(self, action: action, for: .touchUpInside)
        button.accessibilityTraits = .button
        return button
    }

    @objc private func preferenceChanged() {
        renderRecommendations()
    }

    @objc private func findPicks() {
        renderRecommendations()
        UIAccessibility.post(notification: .announcement, argument: "Updated movie night recommendations")
    }

    private func renderRecommendations() {
        recommendationsStack.arrangedSubviews.forEach {
            recommendationsStack.removeArrangedSubview($0)
            $0.removeFromSuperview()
        }
        let occasion = ["any", "family", "date-night", "friends", "solo"][max(0, occasionControl.selectedSegmentIndex)]
        let runtime = runtimeControl.selectedSegmentIndex
        let genre = ["Any", "Action", "Comedy", "Family", "Horror", "Sci-Fi"][max(0, genreControl.selectedSegmentIndex)]

        let filtered = catalog.filter { movie in
            let matchesOccasion = occasion == "any" || movie.occasions.contains(occasion)
            let matchesRuntime: Bool
            switch runtime {
            case 1: matchesRuntime = movie.minutes < 100
            case 2: matchesRuntime = movie.minutes >= 100 && movie.minutes <= 130
            case 3: matchesRuntime = movie.minutes > 130
            default: matchesRuntime = true
            }
            let matchesGenre = genre == "Any" || movie.genres.contains(genre)
            return matchesOccasion && matchesRuntime && matchesGenre
        }

        recommendations = filtered
            .prefix(3)
            .map { $0 }

        let filterDescription = [
            occasion == "any" ? "any occasion" : occasionControl.titleForSegment(at: occasionControl.selectedSegmentIndex)?.lowercased() ?? "your occasion",
            runtimeControl.titleForSegment(at: runtimeControl.selectedSegmentIndex) ?? "any runtime",
            genre == "Any" ? "any genre" : genre,
        ].joined(separator: "  •  ")
        resultCountLabel.text = recommendations.isEmpty
            ? "No validated titles match \(filterDescription)."
            : "\(recommendations.count) validated pick\(recommendations.count == 1 ? "" : "s") for \(filterDescription)"
        lastShareButton?.isEnabled = !recommendations.isEmpty
        lastShareButton?.accessibilityHint = recommendations.isEmpty
            ? "Sharing is unavailable until the planner has at least one validated pick"
            : "Opens the iOS share sheet with validated titles and availability provenance"

        for movie in recommendations {
            recommendationsStack.addArrangedSubview(makeMovieCard(movie))
        }
    }

    private func makeMovieCard(_ movie: NativeMovie) -> UIView {
        let card = UIView()
        card.backgroundColor = UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark ? UIColor.white.withAlphaComponent(0.07) : UIColor.secondarySystemGroupedBackground
        }
        card.layer.cornerRadius = 16
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor.systemPink.withAlphaComponent(0.18).cgColor

        let title = makeLabel(movie.title, style: .headline, color: .label)
        title.numberOfLines = 0
        let metadata = makeLabel("\(movie.year)  •  \(movie.minutes) min  •  \(movie.genres.joined(separator: ", "))", style: .caption1, color: .secondaryLabel)
        metadata.numberOfLines = 0
        let blurb = makeLabel(movie.blurb, style: .footnote, color: .secondaryLabel)
        blurb.numberOfLines = 0
        let provenance = makeLabel("\(movie.sourceLabel)  •  \(movie.region)  •  \(movie.availabilityStatus)  •  \(checkedLabel(movie.checkedAt))", style: .caption2, color: .tertiaryLabel)
        provenance.numberOfLines = 0

        let saveButton = UIButton(type: .system)
        updateWatchlistButton(saveButton, for: movie)
        saveButton.addAction(UIAction { [weak self, weak saveButton] _ in
            self?.toggleWatchlist(movie)
            if let saveButton { self?.updateWatchlistButton(saveButton, for: movie) }
        }, for: .touchUpInside)

        let textStack = UIStackView(arrangedSubviews: [title, metadata, blurb, provenance])
        textStack.axis = .vertical
        textStack.spacing = 5
        textStack.translatesAutoresizingMaskIntoConstraints = false

        saveButton.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(textStack)
        card.addSubview(saveButton)
        NSLayoutConstraint.activate([
            textStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            textStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            textStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            saveButton.topAnchor.constraint(equalTo: textStack.bottomAnchor, constant: 12),
            saveButton.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            saveButton.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            saveButton.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
        ])
        return card
    }

    private func updateWatchlistButton(_ button: UIButton, for movie: NativeMovie) {
        let isSaved = watchlist.contains(movie.title)
        button.setTitle(isSaved ? "Saved to Watchlist" : "Save to Watchlist", for: .normal)
        button.setTitleColor(isSaved ? .systemGreen : .systemPink, for: .normal)
        button.titleLabel?.font = UIFont.preferredFont(forTextStyle: .subheadline)
        button.contentHorizontalAlignment = .leading
        button.accessibilityLabel = isSaved ? "Remove \(movie.title) from Watchlist" : "Save \(movie.title) to Watchlist"
        button.accessibilityHint = isSaved ? "Removes this title from your on-device Watchlist" : "Adds this title to your on-device Watchlist"
    }

    private func toggleWatchlist(_ movie: NativeMovie) {
        if watchlist.contains(movie.title) {
            watchlist.remove(movie.title)
        } else {
            watchlist.insert(movie.title)
        }
        defaults.set(Array(watchlist).sorted(), forKey: "streamflicker.nativeMovieNight.watchlist")
        UIAccessibility.post(notification: .announcement, argument: watchlist.contains(movie.title) ? "Saved \(movie.title)" : "Removed \(movie.title)")
    }

    @objc private func savePlan() {
        guard !recommendations.isEmpty else {
            savedPlanLabel.text = "No validated titles match these preferences yet. Broaden a choice before saving a plan."
            savedPlanLabel.textColor = .secondaryLabel
            return
        }
        let occasion = occasionControl.titleForSegment(at: occasionControl.selectedSegmentIndex) ?? "Any occasion"
        let runtime = runtimeControl.titleForSegment(at: runtimeControl.selectedSegmentIndex) ?? "Any runtime"
        let genre = genreControl.titleForSegment(at: genreControl.selectedSegmentIndex) ?? "Any genre"
        let summary = "\(occasion)  •  \(runtime)  •  \(genre)"
        let titles = recommendations.map(\.title)
        defaults.set(summary, forKey: "streamflicker.nativeMovieNight.lastPlan")
        defaults.set(titles, forKey: "streamflicker.nativeMovieNight.lastRecommendations")
        defaults.set(Date().timeIntervalSince1970, forKey: "streamflicker.nativeMovieNight.lastSavedAt")
        savedPlanLabel.text = "Saved on this device: \(summary)\n\(titles.joined(separator: ", "))"
        savedPlanLabel.textColor = .systemGreen
        UIAccessibility.post(notification: .announcement, argument: "Movie night plan saved on this device")
    }

    @objc private func sharePlan() {
        guard !recommendations.isEmpty else {
            UIAccessibility.post(notification: .announcement, argument: "There are no validated picks to share")
            return
        }
        let occasion = occasionControl.titleForSegment(at: occasionControl.selectedSegmentIndex) ?? "Any occasion"
        let runtime = runtimeControl.titleForSegment(at: runtimeControl.selectedSegmentIndex) ?? "Any runtime"
        let genre = genreControl.titleForSegment(at: genreControl.selectedSegmentIndex) ?? "Any genre"
        let titles = recommendations.map { movie in
            "• \(movie.title) (\(movie.year)) — region \(movie.region); source \(movie.sourceLabel); status \(movie.availabilityStatus); \(checkedLabel(movie.checkedAt)). Current availability can change; check the title before watching or paying."
        }.joined(separator: "\n")
        let text = "StreamFlicker movie night\n\(occasion) • \(runtime) • \(genre)\n\nValidated shortlist:\n\(titles)\n\nPicked from StreamFlicker's bundled validated catalog. No poster artwork or account identity is included."
        let shareController = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        if let popover = shareController.popoverPresentationController, let shareButton = lastShareButton {
            popover.sourceView = shareButton
            popover.sourceRect = shareButton.bounds
        }
        present(shareController, animated: true)
    }

    private func restoreSavedPlan() {
        guard let summary = defaults.string(forKey: "streamflicker.nativeMovieNight.lastPlan"), !summary.isEmpty else {
            savedPlanLabel.text = "Nothing saved yet. Your plan will stay on this device until you replace it."
            return
        }
        let savedTitles = defaults.stringArray(forKey: "streamflicker.nativeMovieNight.lastRecommendations") ?? []
        savedPlanLabel.text = "Last saved on this device: \(summary)\n\(savedTitles.joined(separator: ", "))"
    }
}
