import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DriverHeader from "@/app/(driver)/components/DriverHeader";
import { DRIVER_COLORS, useDriverTheme } from "@/styles/theme";

const helpTopics = {
  guide: {
    title: "Getting Started",
    subtitle: "A quick guide to your daily driver workflow.",
    icon: "waving-hand",
    sections: [
      {
        title: "Before you leave",
        steps: [
          "Open My Route and select the route and time window you are about to drive. If you have more than one assigned route, check the route name before starting.",
          "Tap Start Trip, confirm the pickup or drop-off route, and complete every pre-trip checklist item.",
          "Mark each inspection item OK only after checking it. Mark Issue and add notes for any defect; a failed inspection blocks route start.",
          "A passing inspection can be saved before the route window opens, but you can only go online during the scheduled pickup or drop-off window.",
          "Allow both foreground and background location access when prompted. The app needs it to send your location during the route.",
        ],
      },
      {
        title: "During the route",
        steps: [
          "Use Map for route navigation and Stops for the ordered stop list and student actions. Morning shows pickups; Afternoon shows drop-offs.",
          "At each stop, use Arrived when you reach the location, then tap Picked up only after the student is safely in the vehicle.",
          "At a drop-off, tap Dropped off and complete the recipient and safety PIN check before considering the handoff complete.",
          "Use Child not present or Skip stop only when appropriate. These actions mark the stop skipped; report an incident separately when safety is involved.",
          "Use Messages to contact available parents or your fleet owner when coordination is needed.",
        ],
      },
      {
        title: "Finish the route",
        steps: [
          "The route tracking session ends automatically when all stops in the active window are completed or skipped, or when that route window has ended.",
          "Check the route status before leaving the app. If the route still appears online after its stops are complete, refresh My Route and contact support if it remains active.",
        ],
      },
      {
        title: "When something goes wrong",
        steps: [
          "If an action fails, read the on-screen error. Check your connection and route status, then retry when safely stopped.",
          "If the app says route cleanup failed, do not repeatedly restart the route; contact your fleet owner or support.",
          "Report a route or student incident from the relevant stop or incident report screen.",
          "Use SOS on the dashboard for an emergency that needs immediate attention. For immediate danger, contact local emergency services directly too.",
        ],
      },
    ],
  },
  routes: {
    title: "Routes & Stops",
    subtitle: "Find your assigned routes and work through their stops.",
    icon: "alt-route",
    sections: [
      {
        title: "Open a route",
        steps: [
          "Tap My Route in the bottom navigation.",
          "Choose the assigned route you need; route cards show its name and stop count.",
          "Use Map for the route overview, Stops for stop actions, Students for assigned students, and Details for schedule information.",
        ],
      },
      {
        title: "Start route tracking",
        steps: [
          "Start Trip is available during the configured pickup or drop-off time window. If it says Outside route window, confirm the selected route and wait until its scheduled window.",
          "Complete and pass the pre-trip inspection for the route. Mark every checklist item OK or Issue; add notes to explain defects.",
          "A failed inspection blocks route start. Do not drive an unsafe vehicle; notify your fleet owner and reinspect after repairs.",
          "Allow foreground and background location access. If location permission is denied, enable it in your device Settings and try again.",
          "The app sends an initial location when going online. If startup fails, follow the error shown and check your connection and location permissions.",
        ],
      },
      {
        title: "Work through stops",
        steps: [
          "Select Morning for pickup stops or Afternoon for drop-off stops.",
          "Arrived records that you reached the stop. Picked up completes a pickup stop; use it only after the student is safely in the vehicle.",
          "Dropped off completes a drop-off only after you enter the receiving person's name and the parent's safety PIN.",
          "Child not present and Skip stop mark a stop skipped. Use the accurate reason when the app asks; do not mark a child picked up or dropped off if that did not happen.",
          "A completed or skipped stop no longer shows the action buttons. Refresh the route if its status does not update.",
        ],
      },
      {
        title: "Complete or end a route",
        steps: [
          "The route session ends automatically when every stop in the active pickup or drop-off window is completed or skipped, or when the window ends.",
          "If the app remains online after the route should have ended, refresh the screen. If it is still active, contact your fleet owner or support before starting another route.",
        ],
      },
      {
        title: "Troubleshoot a route",
        steps: [
          "No route listed: pull to refresh or use the refresh control. If it is still missing, ask your fleet owner to check your route assignment.",
          "No stop actions: confirm you are online on the correct route and have selected the correct Morning or Afternoon list.",
          "Location or network error: stop somewhere safe, check device location permissions and internet access, then retry. Never interact with the phone while driving.",
          "If a route start reports that cleanup also failed, contact support before trying to start that route again.",
        ],
      },
    ],
  },
  checkin: {
    title: "Student Check-in",
    subtitle: "Record pickups and safe drop-offs for each student.",
    icon: "fact-check",
    sections: [
      {
        title: "At pickup",
        steps: [
          "Open My Route, choose Stops, and select Morning.",
          "Confirm the child's name and stop address before acting. If the details do not match, do not guess; contact your fleet owner.",
          "Tap Arrived when you reach the stop. This records arrival and the app attempts to create an in-app notification for the parent.",
          "Tap Picked up only after the child is safely in the vehicle. This completes the pickup and the app attempts to create an in-app notification for the parent.",
          "These are in-app notifications; the app does not guarantee a phone push notification.",
        ],
      },
      {
        title: "At drop-off",
        steps: [
          "Choose Stops and select Afternoon.",
          "Tap Dropped off at the correct student's stop.",
          "Enter the receiving person's name and the parent's safety PIN to complete the handoff.",
          "A successful handoff completes the stop and the app attempts to create an in-app notification for the parent, including the recipient's name.",
          "If the parent has not set a safety PIN, pause the handoff and ask the parent or fleet owner to help. Do not bypass the PIN or leave the child with an unverified person.",
          "If the PIN is rejected, confirm it with the parent and try carefully. Five failed attempts can lock PIN entry for 15 minutes; if locked, stop guessing and contact the parent or fleet owner.",
        ],
      },
      {
        title: "If a student is absent",
        steps: [
          "Use Child not present or Skip stop on that student's stop.",
          "Provide a reason when requested so the route record is clear. These actions mark the stop skipped, not picked up or dropped off.",
          "If the child is present but you cannot safely complete the pickup or handoff, report the situation as an incident and contact your fleet owner.",
        ],
      },
      {
        title: "If the stop does not update",
        steps: [
          "Wait for the success or error message and check the stop status before tapping again.",
          "If there is an error, stop somewhere safe, check your internet connection, refresh the route, and retry only if the stop is still pending.",
          "If the action succeeded but the parent says they did not get a phone alert, explain that the app records in-app notifications but may not send a push notification.",
        ],
      },
    ],
  },
  vehicle: {
    title: "Vehicle & Safety",
    subtitle: "Prepare the vehicle and complete the required safety checks.",
    icon: "directions-bus",
    sections: [
      {
        title: "Complete a pre-trip inspection",
        steps: [
          "From My Route, start the trip for the correct route and pickup or drop-off window.",
          "Physically check tyres and wheels, brakes, lights, indicators, seatbelts, first-aid kit, doors and emergency exits, mirrors, and horn.",
          "For every item, select OK only if it passes the check. Select Issue for a defect and add notes that describe what is wrong.",
          "You must answer every checklist item. Any reported safety issue blocks route start; do not proceed until the vehicle is repaired and a new inspection passes.",
          "If the inspection is blocked or a defect cannot be fixed, tell your fleet owner and use Help & Support if you need assistance.",
        ],
      },
      {
        title: "During the journey",
        steps: [
          "Keep to the planned route and observe road rules.",
          "Ensure students are seated and wearing seatbelts before moving.",
          "Do not use the app while driving. Pull over safely before updating a stop, reading messages, or reporting a problem.",
          "If the vehicle becomes unsafe, stop in a safe place, protect the students, and contact your fleet owner or support. Contact emergency services if there is immediate danger.",
        ],
      },
      {
        title: "Location and tracking",
        steps: [
          "Going online requires location access, including background location, so updates can continue when the app is not on screen.",
          "If tracking stops, check that location services and app permissions are enabled and that you have an internet connection.",
          "If you cannot restore tracking, stop safely and contact your fleet owner. Do not assume parents can see a live location when the app is offline.",
        ],
      },
    ],
  },
  coordination: {
    title: "Parents & School",
    subtitle: "Keep families and your school or fleet contacts informed.",
    icon: "groups",
    sections: [
      {
        title: "Contact parents",
        steps: [
          "Open Messages to view conversations available to your driver account.",
          "Use the relevant parent conversation to coordinate pickup, delays, or handoff details.",
          "Record Arrived, Picked up, and Dropped off against the correct student's stop. The app attempts to create in-app notifications for the parent account linked to that child.",
          "Stop notifications are in-app records; do not promise that a phone push notification will arrive.",
        ],
      },
      {
        title: "Share clear updates",
        steps: [
          "Keep messages brief, respectful, and specific to the route or student.",
          "When a driver has multiple routes, confirm the child's route and school before sending a route-specific update.",
          "For an incident or safety concern, use the incident reporting flow instead of relying only on chat.",
          "If a parent is not available to verify a drop-off PIN, do not bypass the handoff check. Contact your fleet owner for help.",
        ],
      },
    ],
  },
  emergency: {
    title: "Emergencies",
    subtitle: "Escalate urgent situations and record incidents clearly.",
    icon: "emergency",
    sections: [
      {
        title: "Immediate danger",
        steps: [
          "Prioritize the safety of students and yourself; move to a safe location when possible.",
          "Contact local emergency services directly when immediate assistance is required.",
          "Use SOS on the driver dashboard to record an emergency and notify configured support and family or school recipients. Check the confirmation for any delivery warning.",
          "SOS is not a replacement for calling emergency services. If the alert fails or there is immediate danger, call emergency services directly.",
        ],
      },
      {
        title: "Report an incident",
        steps: [
          "Open an incident report from the affected route stop or the incident reporting screen.",
          "Select the affected route and student when applicable.",
          "Describe what happened and submit the report so it can be followed up.",
          "If reporting from a stop, open Report incident for that stop so the route and student are attached when available.",
        ],
      },
      {
        title: "After the situation",
        steps: [
          "Notify your fleet owner or school contact as soon as it is safe to do so.",
          "Keep your account available for follow-up from support.",
          "For app or account help, use Help & Support to start a support chat or lodge a ticket. Include the route name, approximate time, and what happened; never include a password or safety PIN.",
        ],
      },
    ],
  },
} as const;

type HelpTopicKey = keyof typeof helpTopics;

export default function DriverHelpTopicPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topic?: string | string[] }>();
  const topicParam = Array.isArray(params.topic)
    ? params.topic[0]
    : params.topic;
  const topic = topicParam ? helpTopics[topicParam as HelpTopicKey] : undefined;
  const { colors } = useDriverTheme();

  if (!topic) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: DRIVER_COLORS.background },
        ]}
      >
        <DriverHeader title="Help topic" showBackButton />
        <View style={styles.emptyState}>
          <MaterialIcons
            name="help-outline"
            size={34}
            color={DRIVER_COLORS.muted}
          />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            Topic not found
          </Text>
          <Text
            style={[styles.emptyDescription, { color: colors.text.secondary }]}
          >
            Return to Help & Support and choose one of the available topics.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: DRIVER_COLORS.background }]}
    >
      <DriverHeader
        title={topic.title}
        subtitle="Driver help guide"
        showBackButton
        onBackPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialIcons
              name={topic.icon}
              size={26}
              color={DRIVER_COLORS.primary}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{topic.title}</Text>
            <Text style={styles.heroSubtitle}>{topic.subtitle}</Text>
          </View>
        </View>

        {topic.sections.map((section, sectionIndex) => (
          <View
            key={section.title}
            style={[styles.sectionCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.sectionHeading}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>{sectionIndex + 1}</Text>
              </View>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                {section.title}
              </Text>
            </View>
            {section.steps.map((step, stepIndex) => (
              <View
                key={`${section.title}-${stepIndex}`}
                style={styles.stepRow}
              >
                <View style={styles.stepMarker}>
                  <View style={styles.stepDot} />
                  {stepIndex < section.steps.length - 1 ? (
                    <View style={styles.stepLine} />
                  ) : null}
                </View>
                <Text
                  style={[styles.stepText, { color: colors.text.secondary }]}
                >
                  {step}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 36,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginBottom: 14,
    borderRadius: 22,
    backgroundColor: DRIVER_COLORS.card,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: DRIVER_COLORS.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    marginLeft: 14,
  },
  heroTitle: {
    color: DRIVER_COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: DRIVER_COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  sectionCard: {
    marginBottom: 13,
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.cardBorder,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 15,
  },
  sectionNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F3ED",
  },
  sectionNumberText: {
    color: DRIVER_COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 44,
  },
  stepMarker: {
    width: 18,
    alignItems: "center",
    marginRight: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: DRIVER_COLORS.primary,
  },
  stepLine: {
    width: 1,
    flex: 1,
    marginTop: 5,
    marginBottom: 2,
    backgroundColor: DRIVER_COLORS.cardBorder,
  },
  stepText: {
    flex: 1,
    paddingBottom: 14,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyDescription: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
