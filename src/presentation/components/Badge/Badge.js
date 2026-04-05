import { jsx as _jsx } from "react/jsx-runtime";
import styles from './Badge.module.css';
export function Badge({ variant, text }) {
    return _jsx("span", { className: `${styles.badge} ${styles[variant]}`, children: text });
}
