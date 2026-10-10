import type { Metadata } from "next";
import { TravelChat } from "@/components/features/chat/travel-chat";
export const metadata: Metadata = { title: "Asistente de viajes — TravelMind", description: "Encuentra experiencias y prepara tu cotización de viaje." };
export default function ChatPage() { return <TravelChat />; }
