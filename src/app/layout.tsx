export const metadata = {
  title: "Repo → Docs (Local LLM)",
  description: "Generate grounded docs from any public GitHub repo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
