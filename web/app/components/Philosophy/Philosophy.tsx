import React from "react";

const Philosophy = () => {
  return (
    <div className="w-full bg-pink-200 rounded-2xl p-6 flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-center">Filozófiánk</h2>
      <div className="flex flex-row justify-between w-full">
        <div className="flex flex-col w-1/3 space-x-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="bg-white rounded-lg px-2 py-1">❤️</div>
            <span className="text-sm font-semibold">Szeretet</span>
          </div>
          <p className="text-[0.8rem] text-gray-700 max-w-5/6">
            hiszek az allatokban gg wp ff15hiszek az allatokban gg wp ff15hiszek
            az allatokban gg wp
          </p>
        </div>
        <div className="flex flex-col w-1/3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="bg-white rounded-lg px-2 py-1">🐾</div>
            <span className="text-sm font-semibold">Örökbefogadás</span>
          </div>
          <p className="text-[0.8rem] text-gray-700 max-w-5/6">
            Lorem ipsum dolor, sit amet consectetur ad lorem lorem lorem lorem
            foobarfoobar foobar
          </p>
        </div>
        <div className="flex flex-col w-1/3">
          <p className=" font-semibold text-gray-900 h-full max-h-full">
            Lorem ipsum dolor sit, amet conLorem ipsum dolor sit, amet
            consectetur adipisicing e
          </p>
        </div>
      </div>
    </div>
  );
};

export default Philosophy;
