import { CheckIcon } from "@heroicons/react/24/outline";

/**
 * Shared shell for transaction flows (matches Send Money): gradient page, sticky aside, main card.
 */
export default function TransactionFlowLayout({
  icon: Icon,
  asideIconClassName = "",
  title,
  subtitle,
  steps,
  currentStepKey,
  renderAside,
  children,
}) {
  const stepIndex =
    steps?.length && currentStepKey
      ? steps.findIndex((s) => s.key === currentStepKey)
      : -1;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/90 animate-in fade-in duration-500">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-6 pt-2 sm:px-8 sm:pb-10 sm:pt-4 lg:pb-12 lg:pt-6">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-14">
          <aside className="animate-in slide-in-from-left-4 duration-700 lg:col-span-4 lg:sticky lg:top-24">
            {renderAside ? (
              renderAside()
            ) : (
              <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-100">
                  <Icon
                    className={`h-6 w-6 ${asideIconClassName}`}
                    strokeWidth={2}
                  />
                </div>
                <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl xl:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-sm text-base font-medium leading-relaxed text-slate-500">
                  {subtitle}
                </p>

                {steps?.length > 0 && currentStepKey != null && stepIndex >= 0 ? (
                  <nav className="mt-10 hidden lg:block" aria-label="Progress">
                    <ol>
                      {steps.map((s, i) => {
                        const active = currentStepKey === s.key;
                        const done = stepIndex > i;
                        return (
                          <li key={s.key} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition-colors ${
                                  active
                                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                                    : done
                                      ? "bg-emerald-500 text-white"
                                      : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {done && !active ? (
                                  <CheckIcon className="h-5 w-5" strokeWidth={2.5} />
                                ) : (
                                  i + 1
                                )}
                              </span>
                              {i < steps.length - 1 ? (
                                <span
                                  className={`my-1.5 block min-h-[2rem] w-px grow transition-colors duration-500 ${
                                    done ? "bg-emerald-500" : "bg-slate-200"
                                  }`}
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                            <div
                              className={`min-w-0 pb-8 ${active ? "" : "opacity-55"}`}
                            >
                              <p className="text-sm font-bold text-slate-900">
                                {s.label}
                              </p>
                              <p className="text-xs font-medium text-slate-400">
                                {s.hint}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                ) : null}
              </div>
            )}
          </aside>

          <div className="animate-in slide-in-from-right-4 duration-700 lg:col-span-8">
            <div className="mx-auto flex min-h-[min(640px,72vh)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 sm:max-w-2xl sm:rounded-[2.5rem] sm:p-8 md:p-10">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
