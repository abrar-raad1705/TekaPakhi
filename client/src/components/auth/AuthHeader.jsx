import logo from "../../assets/icons/logo.svg";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function AuthHeader({ onClose }) {
  return (
    <>
      <header className="w-full bg-white sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:py-6 md:px-10">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="TekaPakhi Logo"
              className="h-8 w-auto scale-125 origin-left"
            />
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <hr className="border-gray-200" />
      </header>
    </>
  );
}
