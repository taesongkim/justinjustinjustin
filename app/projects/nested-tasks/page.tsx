import NestedTodoApp from "./components/NestedTodoApp";

export const metadata = {
  title: "Nested Tasks — justinjustinjustin",
  description: "A keyboard-driven nested column todo list",
};

export default function NestedTasksPage() {
  return (
    <div className="w-full min-h-screen">
      <NestedTodoApp />
    </div>
  );
}
