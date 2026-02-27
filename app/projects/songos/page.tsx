import SongOSShell from "./components/SongOSShell";

export const metadata = {
  title: "SongOS — justinjustinjustin",
  description: "A goals and task manager built on nested tasks",
};

export default function SongOSPage() {
  return (
    <div className="w-full min-h-screen">
      <SongOSShell />
    </div>
  );
}
