import { motion } from "framer-motion";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

interface StatsProps {
  totalFaculty: number;
  present: number;
  absent: number;
  onLeave: number;
}

const cards = [
  { key: "total", label: "Total Faculty", icon: Users, colorClass: "text-primary", borderClass: "border-t-primary" },
  { key: "present", label: "Present Today", icon: UserCheck, colorClass: "text-success", borderClass: "border-t-success" },
  { key: "absent", label: "Absent Today", icon: UserX, colorClass: "text-destructive", borderClass: "border-t-destructive" },
  { key: "leave", label: "On Leave", icon: Clock, colorClass: "text-warning", borderClass: "border-t-warning" },
] as const;

const StatsCards = ({ totalFaculty, present, absent, onLeave }: StatsProps) => {
  const values = { total: totalFaculty, present, absent, leave: onLeave };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`glass-surface rounded-xl p-4 sm:p-5 border-t-[3px] ${card.borderClass}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.7rem] uppercase tracking-widest text-muted-foreground font-medium">{card.label}</span>
            <card.icon className={`w-4 h-4 ${card.colorClass}`} />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold">{values[card.key]}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;
