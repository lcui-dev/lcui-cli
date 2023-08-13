import React from "react";
import styles from "./home.module.css";

export default function Home() {
  return (
    <div className="home">
      <text className={styles.text}>Hello, World!</text>
      <button className={styles.button}>Ok</button>
    </div>
  );
}
