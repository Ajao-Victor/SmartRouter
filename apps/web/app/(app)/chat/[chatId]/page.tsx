export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  return (
    <section className="space-y-2">
      <p className="num text-2xs tracking-label text-text-2 uppercase">chat · {chatId}</p>
      <p className="text-sm text-text-1">The chat workspace arrives in Task 21.</p>
    </section>
  );
}
