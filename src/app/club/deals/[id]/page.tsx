"use client";
import { useParams } from "next/navigation";
import { DealView } from "@/components/DealView";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <DealView id={id} as="club" />;
}
