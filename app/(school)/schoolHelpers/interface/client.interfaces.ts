import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export type DashboardAction = {
  title: string;
  icon: IoniconName;
  color: string;
  screen: string;
};

export type RecentTrip = {
  id: string;
  route: string;
  vehicle: string;
  driver: string;
  status: string;
  statusColor: string;
  time: string;
};
