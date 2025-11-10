interface ModulePageProps {
  params: { moduleId: string };
}

export default function ModulePage({ params }: ModulePageProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8" />
  );
}
