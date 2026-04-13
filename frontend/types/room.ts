export type RoomType = 'Single' | 'Double' | 'Triple';
export type AvailabilityStatus = 'Available' | 'Full' | 'Maintenance';

export type Room = {
  id: string;
  roomNumber: string;
  roomType: RoomType;
  capacity: number;
  currentOccupancy: number;
  pricePerMonth: number;
  availabilityStatus: AvailabilityStatus;
  description: string;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type RoomFormValues = {
  roomNumber: string;
  roomType: RoomType;
  pricePerMonth: string;
  capacity: number;
  description: string;
  availabilityStatus: AvailabilityStatus;
  /** Local URIs from the image picker — uploaded as multipart when present */
  imageUris: string[];
};
