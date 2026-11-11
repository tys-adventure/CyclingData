import Foundation
import HealthKit
import CoreLocation

final class HealthImporter {
    private let store = HKHealthStore()
    private let hr = HKQuantityType(.heartRate)
    private let power = HKQuantityType(.cyclingPower)
    private let route = HKSeriesType.workoutRoute()

    func authorize() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw ImportError.unavailable }
        try await store.requestAuthorization(toShare: [], read: [HKObjectType.workoutType(), hr, power, route, HKQuantityType(.distanceCycling)])
    }

    func rides() async throws -> [[String: Any]] {
        let since = Calendar.current.date(byAdding: .day, value: -90, to: Date())!
        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForWorkouts(with: .cycling),
            HKQuery.predicateForSamples(withStart: since, end: Date(), options: .strictStartDate)
        ])
        let workouts = try await samples(type: HKObjectType.workoutType(), predicate: predicate, limit: 2001).compactMap { $0 as? HKWorkout }
        guard workouts.count <= 2000 else { throw ImportError.tooMany }
        var rides: [[String: Any]] = []
        for workout in workouts {
            let predicate = HKQuery.predicateForObjects(from: workout)
            let heartRates = try await samples(type: hr, predicate: predicate).compactMap { $0 as? HKQuantitySample }
            let powers = try await samples(type: power, predicate: predicate).compactMap { $0 as? HKQuantitySample }
            let routes = try await samples(type: route, predicate: predicate).compactMap { $0 as? HKWorkoutRoute }
            var locations: [CLLocation] = []
            for route in routes { locations += try await routeLocations(route) }
            locations.sort { $0.timestamp < $1.timestamp }
            let timeline = Set(heartRates.map(\.startDate) + powers.map(\.startDate) + locations.map(\.timestamp)).sorted()
            let times = timeline.count <= 1200 ? timeline : (0..<1200).map { timeline[Int(Double($0) * Double(timeline.count-1) / 1199)] }
            let hrValues = heartRates.map { ($0.startDate, $0.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))) }
            let powerValues = powers.map { ($0.startDate, $0.quantity.doubleValue(for: .watt())) }
            let iso = ISO8601DateFormatter()
            var streams: [String: Any] = [
                "time": times.map { $0.timeIntervalSince(workout.startDate) },
                "heartrate": align(times, hrValues),
                "watts": align(times, powerValues)
            ]
            var locationIndex = 0
            var latlng: [Any] = [], altitude: [Any] = []
            for time in times {
                while locationIndex+1 < locations.count && locations[locationIndex+1].timestamp <= time { locationIndex += 1 }
                if !locations.isEmpty, abs(locations[locationIndex].timestamp.timeIntervalSince(time)) <= 5, locations[locationIndex].horizontalAccuracy >= 0 {
                    let point = locations[locationIndex]
                    latlng.append([point.coordinate.latitude, point.coordinate.longitude])
                    altitude.append(point.verticalAccuracy >= 0 ? point.altitude as Any : NSNull())
                } else { latlng.append(NSNull()); altitude.append(NSNull()) }
            }
            streams["latlng"] = latlng; streams["altitude"] = altitude
            let ascent = (workout.metadata?[HKMetadataKeyElevationAscended] as? HKQuantity)?.doubleValue(for: .meter()) ?? 0
            rides.append([
                "name": "Apple Health cycling", "source_id": workout.uuid.uuidString.lowercased(),
                "started_at": iso.string(from: workout.startDate),
                "distance_m": workout.totalDistance?.doubleValue(for: .meter()) ?? 0,
                "elevation_m": ascent, "duration_s": workout.duration,
                "_details": ["source": "apple_health", "summary": [
                    "elapsed_s": workout.endDate.timeIntervalSince(workout.startDate),
                    "timer_s": workout.duration, "moving_s": NSNull(), "device_watts": NSNull(), "moving_estimated": false
                ], "streams": streams]
            ])
        }
        return rides
    }

    private func samples(type: HKSampleType, predicate: NSPredicate, limit: Int = 200001) async throws -> [HKSample] {
        try await withCheckedThrowingContinuation { continuation in
            store.execute(HKSampleQuery(sampleType: type, predicate: predicate, limit: limit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]) { _, result, error in
                if let error { continuation.resume(throwing: error) }
                else if (result?.count ?? 0) > 200000 { continuation.resume(throwing: ImportError.tooMany) }
                else { continuation.resume(returning: result ?? []) }
            })
        }
    }

    private func routeLocations(_ route: HKWorkoutRoute) async throws -> [CLLocation] {
        try await withCheckedThrowingContinuation { continuation in
            var points: [CLLocation] = []
            var finished = false
            let query = HKWorkoutRouteQuery(route: route) { [store] query, locations, done, error in
                guard !finished else { return }
                if let error { finished = true; continuation.resume(throwing: error); return }
                points.append(contentsOf: locations ?? [])
                if points.count > 200000 { finished = true; store.stop(query); continuation.resume(throwing: ImportError.tooMany); return }
                if done { finished = true; continuation.resume(returning: points) }
            }
            store.execute(query)
        }
    }

    private func align(_ times: [Date], _ samples: [(Date, Double)]) -> [Any] {
        var index = 0
        return times.map { time in
            while index+1 < samples.count && samples[index+1].0 <= time { index += 1 }
            guard !samples.isEmpty, samples[index].0 <= time, time.timeIntervalSince(samples[index].0) <= 5 else { return NSNull() }
            return samples[index].1
        }
    }
    private enum ImportError: LocalizedError {
        case unavailable, tooMany
        var errorDescription: String? {
            switch self {
            case .unavailable: "Apple Health is unavailable on this device."
            case .tooMany: "There are too many workouts or samples for this import. Use activity files for this history."
            }
        }
    }
}
