export type RouteStatus = {
  text: string;
  color: string;
  bgColor: string;
};

export interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  model: string;
  color?: string;
  driver_id?: string;
  driverId?: string;
  images?: string[];
  vehicle_images?: { url: string; fileName: string; uploadedAt: string }[];
  drivers?: {
    id: string;
    vehicle_plate_number: string;
    users?: { name: string };
  };
  status?: string;
  capacity?: number;
  route_id?: string;
  routes?: { name: string };
  route_assignments?: {
    id: string;
    route_id: string;
    is_active: boolean;
    routes?: { id: string; route_name: string };
  }[];
  insurance_expiry?: string;
  maintenance_due?: string;
}

export interface SelectedVehicle {
  id: string;
  name: string;
  license_plate: string;
  model: string;
  color?: string;
  status?: string;
  display_status?: string;
  capacity?: number;
  route_id?: string;
  routes?: { name: string };
  route_assignments?: {
    id: string;
    route_id: string;
    is_active: boolean;
    routes?: { id: string; route_name: string };
  }[];
  insurance_expiry?: string;
  maintenance_due?: string;
  images?: string[];
  vehicle_images?: { url: string; fileName: string; uploadedAt: string }[];
  drivers?: {
    id: string;
    vehicle_plate_number: string;
    users?: { name: string };
  };
  vehicle_qr_code?: string | { dataUrl?: string; uri?: string };
}
