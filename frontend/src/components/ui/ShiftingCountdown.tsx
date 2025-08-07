import { useAnimate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

const ShiftingCountdown = ({ endTime }) => {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-xl">
      <div className="mx-auto flex w-full max-w-md items-center bg-white rounded-lg shadow-sm">
        <CountdownItem unit="Day" text="days" endTime={endTime} />
        <CountdownItem unit="Hour" text="hours" endTime={endTime} />
        <CountdownItem unit="Minute" text="minutes" endTime={endTime} />
        <CountdownItem unit="Second" text="seconds" endTime={endTime} />
      </div>
    </div>
  );
};

const CountdownItem = ({ unit, text, endTime }) => {
  const { ref, time } = useTimer(unit, endTime);

  return (
    <div className="flex h-20 w-1/4 flex-col items-center justify-center gap-1 border-r-[1px] border-gray-200 font-mono md:h-24 md:gap-2">
      <div className="relative w-full overflow-hidden text-center">
        <span
          ref={ref}
          className="block text-xl font-medium text-gray-800 md:text-2xl lg:text-3xl"
        >
          {time}
        </span>
      </div>
      <span className="text-xs font-light text-gray-500 md:text-sm">
        {text}
      </span>
    </div>
  );
};

const useTimer = (unit, endTime) => {
  const [ref, animate] = useAnimate();
  const intervalRef = useRef(null);
  const timeRef = useRef(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    intervalRef.current = setInterval(handleCountdown, 1000);

    return () => clearInterval(intervalRef.current || undefined);
  }, [endTime]);

  const handleCountdown = async () => {
    const end: any = new Date(endTime);
    const now: any = new Date();
    const distance = end - now;

    let newTime = 0;

    if (distance <= 0) {
      newTime = 0; // Timer stops at 0
    } else if (unit === "Day") {
      newTime = Math.floor(distance / DAY);
    } else if (unit === "Hour") {
      newTime = Math.floor((distance % DAY) / HOUR);
    } else if (unit === "Minute") {
      newTime = Math.floor((distance % HOUR) / MINUTE);
    } else {
      newTime = Math.floor((distance % MINUTE) / SECOND);
    }

    if (newTime !== timeRef.current) {
      // Exit animation
      await animate(
        ref.current,
        { y: ["0%", "-50%"], opacity: [1, 0] },
        { duration: 0.35 }
      );

      timeRef.current = newTime;
      setTime(newTime);

      // Enter animation
      await animate(
        ref.current,
        { y: ["50%", "0%"], opacity: [0, 1] },
        { duration: 0.35 }
      );
    }
  };

  return { ref, time };
};

export default ShiftingCountdown;
