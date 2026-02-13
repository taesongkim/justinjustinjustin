import PsychologistLineage from "../../components/PsychologistLineage";

export const metadata = {
  title: "CE Lineage Visual — justinjustinjustin",
  description: "Interactive 3D visualization of the lineage of body-oriented psychotherapy",
};

export default function CELineageVisualPage() {
  return (
    <div className="w-full h-screen">
      <PsychologistLineage />
    </div>
  );
}
