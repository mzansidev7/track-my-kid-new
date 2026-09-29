import { useLocalSearchParams } from "expo-router";
import IncidentReportForm from "../components/IncidentReportForm";

export default function DriverIncidentReport() {
  const params = useLocalSearchParams<{ routeId?: string; childId?: string }>();
  return (
    <IncidentReportForm
      role="driver"
      initialRouteId={params.routeId}
      initialChildId={params.childId}
    />
  );
}
