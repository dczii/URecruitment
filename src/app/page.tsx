export default function Home() {
  return (
    <main className="bg-background text-foreground flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-title font-heading">URecruitment</h1>
      <p className="text-body text-muted-foreground">
        MVP scaffold. Screens arrive with the design system (Epic #3).
      </p>
      <p lang="zh-Hans" className="text-body text-muted-foreground">
        候选人资料 · 工作经历与技能
      </p>
    </main>
  );
}
