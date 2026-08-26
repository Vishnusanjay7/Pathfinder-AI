import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-gray-400 mt-1 text-sm">{subtitle}</p>}
    </motion.div>
  );
}
