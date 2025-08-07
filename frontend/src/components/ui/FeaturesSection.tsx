import React from "react";
import { motion, easeInOut, easeOut } from "framer-motion";

const features = [
  {
    image: "https://img.icons8.com/clouds/100/time-machine.png",
    title: "Real-Time Booking",
    desc: "Check parking availability and book instantly with live updates.",
  },
  {
    image: "https://img.icons8.com/clouds/100/bank-card-back-side.png",
    title: "Secure Payments",
    desc: "Pay easily and safely with eSewa using QR verification.",
  },
  {
    image: "https://img.icons8.com/clouds/100/admin-settings-male.png",
    title: "Admin Management",
    desc: "Admins can manage users and control slot bookings efficiently.",
  },
];

const featureVariant = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.3,
      duration: 0.6,
      ease: easeOut,
    },
  }),
};

const FeaturesSection: React.FC = () => {
  return (
    <div className="py-20 px-4 md:px-10 bg-white">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-blue-800">
        Powerful Features
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            custom={index}
            variants={featureVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            className="bg-white shadow-xl rounded-3xl p-8 text-center border border-gray-200"
          >
            <img
              src={feature.image}
              alt={feature.title}
              className="h-24 w-24 mx-auto mb-6"
            />
            <h3 className="text-xl md:text-2xl font-semibold text-blue-700 mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 text-base md:text-lg">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FeaturesSection;
