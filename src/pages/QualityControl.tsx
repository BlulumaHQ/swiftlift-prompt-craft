import NavHeader from '@/components/NavHeader';

const QualityControl = () => {
  return (
    <div className="flex flex-col h-screen">
      <NavHeader title="Quality Control" />
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="console-card p-6 max-w-3xl mx-auto">
          <h1 className="text-lg font-semibold text-foreground mb-4">Quality Control</h1>
          <p className="text-sm text-muted-foreground">
            Quality control tools and checklists will be available here.
          </p>
        </div>
      </main>
    </div>
  );
};

export default QualityControl;
