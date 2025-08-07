import React from "react";
import { motion } from "framer-motion";
import { IconType } from "react-icons";

type StatCardProps = {
  title: string;
  value: number | string;
  color: string;
  Icon: IconType;
};

export const StatCard = ({ title, value, color, Icon }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.4 }}
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full bg-opacity-10 ${color}`}>
          <Icon className={`text-3xl ${color}`} />
        </div>
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className={`text-xl font-semibold ${color}`}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
};
