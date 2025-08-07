import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Typewriter from "typewriter-effect";
import { DottedButton } from "../components/ui/DottedButton.tsx";
import DrawCircleText from "../components/ui/DrawCircleText.tsx";
import FeaturesSection from "../components/ui/FeaturesSection.tsx";

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

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 md:px-10">
      {/* Hero Section */}
      <motion.div
        className="flex flex-col-reverse md:flex-row items-center justify-between py-20 gap-12"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center md:text-left max-w-xl">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-4">
            Smarter Parking for Smarter Cities
          </h1>
          <div className="p-6 text-xl md:text-2xl font-medium text-center">
            <Typewriter
              options={{
                strings: [
                  "Book your slot in real-time, pay with ease, and skip the parking stress. Experience modern parking today.",
                ],
                autoStart: true,
                loop: true,
              }}
            />
          </div>

          <div className="flex justify-center md:justify-start gap-4">
            <DottedButton to="/register">Get Started</DottedButton>

            <DottedButton to="/login">Login</DottedButton>
          </div>
        </div>
        <DotLottieReact
          src="/animations/Man waiting car.json"
          loop
          autoplay
          className="w-full md:w-1/2 rounded-xl shadow-lg"
        />
      </motion.div>

      <FeaturesSection />

      <div className="text-center py-12 bg-blue-50 rounded-xl mt-16 shadow">
        <img
          src="https://randomuser.me/api/portraits/men/32.jpg"
          alt="User Avatar"
          className="mx-auto h-20 w-20 rounded-full mb-4 shadow-md"
        />
        <h2 className="text-2xl font-bold text-blue-800 mb-2">
          What Our Users Say
        </h2>
        <p className="max-w-xl mx-auto text-gray-600 italic">
          "This app completely transformed how I park in the city. Booking is
          super fast and payments are seamless!"
        </p>
        <p className="text-blue-600 font-semibold mt-2">— A Happy Driver</p>
      </div>

      {/* Call to Action */}
      <div className="text-center py-16">
        <DrawCircleText />
        <Link
          to="/register"
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
