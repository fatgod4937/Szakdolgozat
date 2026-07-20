export class CreateShelterDto {
  name: string;
  description?: string | null;
  city?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  verified?: boolean;
}
