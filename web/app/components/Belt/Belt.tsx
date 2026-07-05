import React from "react";
const animals = {
  animals: [
    {
      name: "Bodri",
      image:
        "https://cdn.pixabay.com/photo/2016/03/27/21/16/dog-1284307_960_720.jpg",
      location: "Budapest",
    },
    {
      name: "Cirmi",
      image:
        "https://cdn.pixabay.com/photo/2017/11/09/21/41/cat-2934720_960_720.jpg",
      location: "Debrecen",
    },
    {
      name: "Folti",
      image:
        "https://cdn.pixabay.com/photo/2016/03/27/21/16/dog-1284307_960_720.jpg",
      location: "Pécs",
    },
    {
      name: "Luna",
      image:
        "https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_960_720.jpg",
      location: "Győr",
    },
  ],
};

export const Belt = () => {
  return (
    <div className="flex flex-row space-x-3 mt-2 max-w-full w-full items-center justify-around">
      {animals.animals.map((item) => {
        return (
          <div
              key={item.name}
            style={{ backgroundImage: `url(${item.image})` }}
            className="relative w-1/4 h-75 rounded-xl overflow-hidden shadow-lg bg-cover bg-center"
          >
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent"></div>
            <div className="absolute bottom-2 left-2 text-white">
              <h3 className="font-bold text-lg">{item.name}</h3>
              <p className="text-sm opacity-80">{item.location}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
