import emsHero from "@/assets/ems-hero.jpg";
import emsCoach from "@/assets/ems-coach.jpg";
import emsEquipment from "@/assets/ems-equipment.jpg";
import emsGroup from "@/assets/ems-group.jpg";
import emsStudio from "@/assets/ems-studio.jpg";
import trainer1 from "@/assets/trainer-1.jpg";
import trainer2 from "@/assets/trainer-2.jpg";
import trainer3 from "@/assets/trainer-3.jpg";

export const media = {
  emsHero,
  emsCoach,
  emsEquipment,
  emsGroup,
  emsStudio,
  trainer1,
  trainer2,
  trainer3,
};

/** Cover image per training slug. */
export const trainingCover: Record<string, string> = {
  "ems-master-certification": emsHero,
  "ems-foundation": emsGroup,
  "performance-coaching-lab": emsCoach,
  "applied-sports-nutrition": emsStudio,
  "studio-business-accelerator": emsStudio,
  "ai-motion-analytics": emsEquipment,
};

export const trainers = [
  {
    name: "Dr. Léa Farhat",
    photo: trainer1,
    speciality: "EMS Physiology",
    bio: "Leads the EMS Master Certification. Fifteen years mapping impulse parameters to real muscular response in studio conditions.",
    tags: ["Impulse physiology", "Suit calibration", "Safety screening"],
    sessions: "EMS Master Certification · EMS Foundation",
  },
  {
    name: "Marc Devries",
    photo: trainer2,
    speciality: "Performance Coaching",
    bio: "Builds the coaching layer of the curriculum: cueing, adherence and 12-week progression blocks for EMS clients.",
    tags: ["Periodization", "Coaching language", "Client retention"],
    sessions: "Performance Coaching Lab",
  },
  {
    name: "Sofia Lindqvist",
    photo: trainer3,
    speciality: "Movement Data",
    bio: "Runs the analytics track — turning sensor and pose data into coaching decisions coaches can actually defend.",
    tags: ["Pose estimation", "Sensor fusion", "Reporting"],
    sessions: "AI Motion Analytics",
  },
];
