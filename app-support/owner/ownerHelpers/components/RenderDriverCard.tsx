import { Image, Text, TouchableOpacity, View } from "react-native";
import { driversPageStyles } from "../styles/ownerStyles";

/* ---------------- DRIVER CARD ---------------- */
export const RenderDriverCardItem = ({
  item,
  openDriver,
  getInitials,
}: any) => {
  // Handle divider
  if (item.isDivider) {
    return (
      <View style={driversPageStyles.driverDivider}>
        <View style={driversPageStyles.dividerLine} />
        <Text style={driversPageStyles.dividerText}>Inactive Drivers</Text>
        <View style={driversPageStyles.dividerLine} />
      </View>
    );
  }

  const name = item.name || item.raw?.users?.name || "Driver";
  const email = item.email || item.raw?.users?.email || "";
  const phone = item.phone || item.raw?.users?.phone || "";
  const vehicles = item.vehicles?.length ?? item.raw?.vehicles?.length ?? 0;
  const routes = item.routes ?? item.raw?.routes ?? 0;
  const students = item.students ?? item.raw?.students ?? 0;
  const status = item.status || (vehicles > 0 ? "active" : "inactive");
  const avatar = item.avatar || item.raw?.avatar || null;
  const isInactive = status === "inactive";

  return (
    <TouchableOpacity
      style={[
        driversPageStyles.card,
        isInactive && driversPageStyles.cardInactive,
      ]}
      activeOpacity={0.82}
      onPress={() => openDriver(item)}
    >
      <View style={driversPageStyles.cardHeader}>
        <View style={driversPageStyles.avatarCircle}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={driversPageStyles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                driversPageStyles.avatarText,
                isInactive && driversPageStyles.avatarTextInactive,
              ]}
            >
              {getInitials(name)}
            </Text>
          )}
        </View>

        <View style={driversPageStyles.cardMeta}>
          <Text
            style={[
              driversPageStyles.name,
              isInactive && driversPageStyles.nameInactive,
            ]}
          >
            {name}
          </Text>
          <Text
            style={[
              driversPageStyles.subText,
              isInactive && driversPageStyles.subTextInactive,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {email || phone || "No contact information"}
          </Text>
        </View>

        <View
          style={[
            driversPageStyles.statusPill,
            status === "active"
              ? driversPageStyles.activePill
              : driversPageStyles.inactivePill,
          ]}
        >
          <Text
            style={[
              driversPageStyles.statusText,
              status === "active"
                ? driversPageStyles.activeText
                : driversPageStyles.inactiveText,
            ]}
          >
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      {status === "active" && (
        <View style={driversPageStyles.cardStats}>
          <View style={driversPageStyles.statItem}>
            <Text style={driversPageStyles.statNumber}>{vehicles}</Text>
            <Text style={driversPageStyles.statLabel}>Vehicles</Text>
          </View>
          <View style={driversPageStyles.statItem}>
            <Text style={driversPageStyles.statNumber}>{routes}</Text>
            <Text style={driversPageStyles.statLabel}>Routes</Text>
          </View>
          <View style={driversPageStyles.statItem}>
            <Text style={driversPageStyles.statNumber}>{students}</Text>
            <Text style={driversPageStyles.statLabel}>Students</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};
