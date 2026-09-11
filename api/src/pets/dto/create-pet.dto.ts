import { PetGender, PetSize } from '@prisma/client';

export class CreatePetDto {
  name: string;
  species: string;
  breedId?: string | null;
  ageYears?: string | number | null;
  ageMonths?: string | number | null;
  gender?: PetGender;
  size?: PetSize;
  location: string;
  city?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  description: string;
  goodWithChildren?: string | boolean | null;
  goodWithDogs?: string | boolean | null;
  goodWithCats?: string | boolean | null;
  vaccinated?: string | boolean | null;
  neutered?: string | boolean | null;
  houseTrained?: string | boolean | null;
}
