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