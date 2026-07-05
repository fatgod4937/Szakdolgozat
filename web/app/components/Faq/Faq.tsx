import { useState } from "react";



const faqs = [
  {
    icon: "❤️",
    question: "Hogyan fogadhatok örökbe állatot?",
    answer: "Hogy nelkul",
  },
  {
    icon: "❤️",
    question: "Mennyibe kerül az örökbefogadás?",
    answer: "vegtelen forintba",
  },
  {
    icon: "❤️",
    question: "Jó kezekbe kerülnek az állatok?",
    answer: "remelem",
  },
  {
    icon: "❤️",
    question: "Nem találom meg a megfelelő állatot?",
    answer: "://",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number>(-1);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex == index ? -1 : index);
  };

  return (
    <>
      <div className="flex flex-row justify-center items-center mt-10 gap-8">
        <div className="w-1/2">
          <div
            style={{
              backgroundImage: `url(https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_960_720.jpg)`,
            }}
            className="bg-cover bg-center h-[500px] rounded-xl"
          />
        </div>
        <div className="flex flex-col w-1/2">
          <h2 className="text-2xl font-bold text-justify ">
            Gyakran Ismételt Kérdések
          </h2>
          <p className="text-gray-600 mb-4">
            Itt válaszokat találsz a leggyakrabban felmerülő kérdésekre.
          </p>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-300 rounded-lg">
                <button
                  className="flex justify-between items-start text-start w-full p-4 hover:bg-gray-50"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className={`text-[0.9rem] font-semibold pr-2`}>
                    {faq.icon} {faq.question}
                  </span>
                  {openIndex == index ? (
                    <span className="text-lg text-[0.9rem]">-</span>
                  ) : (
                    <span className="text-lg text-[0.9rem]">+</span>
                  )}
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    openIndex == index
                      ? "opacity-100 visible max-h-40 p-4"
                      : "opacity-0 invisible max-h-0 p-0"
                  }`}
                >
                  <div className="text-gray-600 text-[0.9rem]">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
