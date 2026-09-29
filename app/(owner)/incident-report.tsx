import { useLocalSearchParams } from "expo-router";
import IncidentReportForm from "../components/IncidentReportForm";

export default function OwnerIncidentReport() {
  const params = useLocalSearchParams<{ routeId?: string; childId?: string }>();
  return (
    <IncidentReportForm
      role="owner"
      initialRouteId={params.routeId}
      initialChildId={params.childId}
    />
  );
}
