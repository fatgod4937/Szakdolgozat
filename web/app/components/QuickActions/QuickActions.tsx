"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Plus } from "lucide-react";
import useAuthSession from "../../hooks/useAuthSession";
import { useTranslation } from "react-i18next";
import { askSupportQuestion } from "../../utils/chat-api";

type SupportMessage = {
  content: string;
  sender: "user" | "assistant";
};

const FOOTER_CLEARANCE_PX = 65;
const MOBILE_FOOTER_CLEARANCE_PX = 24;

export default function QuickActions() {
  const { isAuthenticated } = useAuthSession();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(MOBILE_FOOTER_CLEARANCE_PX);
  const assistantRef = useRef<HTMLElement>(null);
  const [openAnswer, setOpenAnswer] = useState<number | null>(null);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { t, i18n } = useTranslation();
  const faqAnswers = [
    [t("actions.adopt"), t("actions.adoptAnswer")],
    [t("actions.listing"), t("actions.listingAnswer")],
    [t("actions.contact"), t("actions.contactAnswer")],
  ];

  useEffect(() => {
    if (!isAssistantOpen) return;

    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (!assistantRef.current?.contains(event.target as Node)) {
        setIsAssistantOpen(false);
      }
    };

    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () =>
      document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, [isAssistantOpen]);

  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;

    const updateBottomOffset = () => {
      const footerTop = footer.getBoundingClientRect().top;
      const footerClearance =
        window.innerWidth < 1024
          ? MOBILE_FOOTER_CLEARANCE_PX
          : FOOTER_CLEARANCE_PX;
      setBottomOffset(
        Math.max(
          footerClearance,
          window.innerHeight - footerTop + footerClearance,
        ),
      );
    };

    updateBottomOffset();
    window.addEventListener("scroll", updateBottomOffset, { passive: true });
    window.addEventListener("resize", updateBottomOffset);
    return () => {
      window.removeEventListener("scroll", updateBottomOffset);
      window.removeEventListener("resize", updateBottomOffset);
    };
  }, []);

  if (!isAuthenticated) return null;

  const sendSupportQuestion = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const question = supportMessage.trim();

    if (!question || isSending) return;

    setSupportMessage("");
    setIsSending(true);
    setSupportMessages((messages) => [
      ...messages,
      { content: question, sender: "user" },
    ]);
    try {
      const { answer } = await askSupportQuestion(question, i18n.language);
      setSupportMessages((messages) => [
        ...messages,
        { content: answer, sender: "assistant" },
      ]);
    } catch {
      setSupportMessages((messages) => [
        ...messages,
        { content: t("actions.supportUnavailable"), sender: "assistant" },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {isAssistantOpen ? (
        <aside
          ref={assistantRef}
          className="fixed bottom-6 left-4 z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:left-6 sm:w-[min(23rem,calc(100vw-3rem))]"
          style={{ bottom: bottomOffset }}
          aria-label={t("actions.support")}
        >
          <div className="flex items-center justify-between bg-black px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">{t("actions.support")}</p>
              <p className="text-xs text-white/65">{t("actions.faq")}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAssistantOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg"
              aria-label={t("nav.menu")}
            >
              -
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto p-4">
            <div className="max-w-[85%] rounded-lg bg-[#fff3fa] p-3 text-sm leading-6 text-black/75">
              {t("actions.supportGreeting")}
            </div>
            {faqAnswers.map(([question, answer], index) => (
              <div key={question} className="border-t border-black/8 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpenAnswer(openAnswer === index ? null : index)
                  }
                  className="w-full text-left text-sm font-medium"
                >
                  {question}
                </button>
                {openAnswer === index ? (
                  <p className="mt-2 max-w-[90%] rounded-lg bg-[#fff8f1] p-3 text-sm leading-6 text-black/65">
                    {answer}
                  </p>
                ) : null}
              </div>
            ))}
            {supportMessages.map((message, index) => (
              <p
                key={`${message.sender}-${index}-${message.content}`}
                className={`max-w-[90%] rounded-lg p-3 text-sm leading-6 ${message.sender === "user" ? "ml-auto bg-black text-white" : "bg-[#fff3fa] text-black/75"}`}
              >
                {message.content}
              </p>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-black/8 p-3"
            onSubmit={sendSupportQuestion}
          >
            <input
              value={supportMessage}
              onChange={(event) => setSupportMessage(event.target.value)}
              placeholder={t("actions.message")}
              className="min-w-0 flex-1 rounded-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/35"
            />
            <button
              type="submit"
              disabled={isSending}
              className="rounded-full bg-[#fec8e9] px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {isSending ? t("actions.sending") : t("actions.send")}
            </button>
          </form>
        </aside>
      ) : null}
      {!isAssistantOpen ? (
        <button
          type="button"
          className="fixed bottom-6 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg transition hover:scale-105 sm:left-6"
          style={{ bottom: bottomOffset }}
          aria-label={t("actions.support")}
          title={t("actions.support")}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      ) : null}
      <Link
        to="/pets/new"
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#fec8e9] text-black shadow-[0_20px_40px_rgba(254,200,233,0.55)] transition hover:scale-105 sm:right-6"
        style={{ bottom: bottomOffset }}
        aria-label={t("actions.addPet")}
        title={t("actions.addPet")}
      >
        <Plus className="h-7 w-7" />
      </Link>
    </>
  );
}
