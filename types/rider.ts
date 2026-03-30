export type VehicleType = "Bike" | "Scooter" | "Car";

export interface DeliveryPartnerRequestBody {
  vehicleType: VehicleType;
  licenseNumber: string;
  vehiclePlate: string;
  licenseFrontUrl: string;
  licenseBackUrl: string;
  vehicleRcUrl: string;
  profilePicUrl: string;
}

export interface DeliveryPartnerResponse {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  vehicleType: VehicleType;
}

export interface DeliveryPartnerError {
  message: string;
  statusCode: number;
}


export interface DeliveryPartnerStatusResponse {
  licenseBackUrl: any;
  vehicleRcUrl: any;
  licenseFrontUrl: any;
  vehiclePlate: string;
  licenseNumber: any;
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  vehicleType: "Bike" | "Scooter" | "Car";
  createdAt: string;
}


export type DriverStatus = "ONLINE" | "OFFLINE";

export interface DeliveryUser {
  name: string;
  email: string;
  phoneNumber: string | null;
  image: string | null;
}

export interface DeliveryProfile {
  id: string;
  userId: string;
  status: DriverStatus;
  currentLat: number | null;
  currentLng: number | null;
  vehicleType: VehicleType;
  licenseNumber: string;
  vehiclePlate: string;
  profilePic: string;
  rating: number;
  ratingCount: number;
  totalDeliveries: number;
  createdAt: string;
  updatedAt: string;
  user: DeliveryUser;
}