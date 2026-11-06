import { useQuery } from "@tanstack/react-query";
import { listLandingPets } from "../../utils/pets-api";

function getImageBaseUrl() {
  const apiUrl =
    import.meta.env.VITE_API_URL ?? "https://192.168.0.100:3000/api";

  return apiUrl.replace(/\/api\/?$/, "");
}

function getPetImageUrl(photoUrl: string) {
  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return photoUrl;
  }

  return `${getImageBaseUrl()}${photoUrl}`;
}

export const Belt = () => {
  const petsQuery = useQuery({
    queryKey: ["landing-pets"],
    queryFn: listLandingPets,
  });
  const pets = petsQuery.data ?? [];

  if (petsQuery.isError) {
    return (
      <p className="mt-8 text-center text-sm text-red-700" role="alert">
        Unable to load featured pets.
      </p>
    );
  }

  if (pets.length === 0) {
    return null;
  }

  return (
    <section className="mt-8" aria-label="Featured pets">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {pets.map((pet) => {
        const mainPhoto = pet.photoUrls[0];

        return (
          <div
            key={pet.id}
            className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black shadow-lg"
          >
            <img
              src={getPetImageUrl(mainPhoto)}
              alt={pet.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent" />
            <div className="absolute bottom-2 left-2 text-white">
              <h3 className="text-lg font-bold">{pet.name}</h3>
              <p className="text-sm opacity-80">{pet.location}</p>
            </div>
          </div>
        );
      })}
      </div>
    </section>
  );
};
