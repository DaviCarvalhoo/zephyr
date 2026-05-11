// AppLiveActivityAttributes — the data shape exchanged between the
// main app target and the widget extension target. Both targets must
// have this file in their compile sources.
//
// Two parts:
//   - Static (top-level) properties don't change for the life of the
//     activity (e.g. taskName, startedAt).
//   - ContentState properties update via Activity.update(). Keep this
//     small — every update round-trips through the system.

import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct AppLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Ticks down per update — show as "MM:SS remaining" in the
        // widget. Keep numeric (vs. pre-formatted) so the widget can
        // render different layouts for Dynamic Island vs Lock Screen.
        var remainingSec: Int
    }

    var taskName: String
    var startedAt: Date
}
