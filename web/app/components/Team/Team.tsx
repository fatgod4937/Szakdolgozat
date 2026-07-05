import React from "react";

const Team = () => {
  return (
    <div className="flex flex-row justify-center items-center mt-10 gap-8 mb-10">
      <div className="flex flex-col w-1/2">
        <h2 className="text-xl font-bold">
          Lorem{" "}
          <span className="bg-[#fec8e9] px-3 py-1 rounded-full text-white">
            ipsum
          </span>{" "}
          dolor sit amet consectetur adipisicing elit. Suscipit labore vero
          doloribus vel
        </h2>
        <p className="mt-4 text-gray-600">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Eum,
          consequuntur, voluptate officiis sapiente debitis aut minus ad dolores
          qui numquam ipsum nostrum ipsa laborum libero, natus alias neque
          excepturi eaque.
        </p>
        <div className="mt-6 space-y-4">
          <div className="flex flex-row items-start space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg">
              ❤️
            </div>
            <div>
              <h3 className="font-semibold">lorem ipsum</h3>
              <p className="text-gray-500 text-[0.8rem]">
                lorem ipsum ipsum lorem
              </p>
            </div>
          </div>
          <div className="flex flex-row items-start space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              🏡
            </div>
            <div>
              <h3 className="font-semibold">lorem ipsum</h3>
              <p className="text-gray-500 text-[0.8rem]">
                ipsum lorem lorem ipsum
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="w-1/2">
        <div className="bg-black w-full h-[400px] rounded-xl" />
      </div>
    </div>
  );
};

export default Team;
