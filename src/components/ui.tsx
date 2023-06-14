import {
  ChangeEventHandler,
  FieldsetHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  useState,
  forwardRef,
  ForwardedRef,
} from "react"
import { multipleClasses } from "@/lib/util/etc"
import {
  FileInput,
  Label as FlowbiteLabel,
  Select as FlowbiteSelect,
  TextInput as FlowbiteTextInput,
  Checkbox as FlowbiteCheckbox,
  Textarea as FlowbiteTextArea,
} from "flowbite-react"

export { Button, Alert, Card, Modal, Accordion } from "flowbite-react"

// components from flowbite.com
// svg from heroicons.dev
// hand drawn arrows from svgrepo.com

export const buttonStyling =
  "text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"

export namespace Svg {
  export const Sidebar = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
      />
    </svg>
  )
  export const Kanban = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
  export const Dashboard = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
    </svg>
  )
  export const Help = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.183l1.562-1.562C15.802 8.249 16 9.1 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.796a4.002 4.002 0 01-.041-2.08l-.08.08-1.53-1.533A5.98 5.98 0 004 10c0 .954.223 1.856.619 2.657l1.54-1.54zm1.088-6.45A5.974 5.974 0 0110 4c.954 0 1.856.223 2.657.619l-1.54 1.54a4.002 4.002 0 00-2.346.033L7.246 4.668zM12 10a2 2 0 11-4 0 2 2 0 014 0z"
        clipRule="evenodd"
      />
    </svg>
  )
  export const Components = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
    </svg>
  )
  export const Documentation = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path
        fillRule="evenodd"
        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
        clipRule="evenodd"
      />
    </svg>
  )
  export const Upgrade = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M378.7 32H133.3L256 182.7L378.7 32zM512 192l-107.4-141.3L289.6 192H512zM107.4 50.67L0 192h222.4L107.4 50.67zM244.3 474.9C247.3 478.2 251.6 480 256 480s8.653-1.828 11.67-5.062L510.6 224H1.365L244.3 474.9z" />
    </svg>
  )
  export const Products = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      />
    </svg>
  )
  export const Users = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
        clipRule="evenodd"
      />
    </svg>
  )
  export const SignUp = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
        clipRule="evenodd"
      />
    </svg>
  )
  export const Inbox = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L11 7.586V3a1 1 0 10-2 0v4.586l-.293-.293z" />
      <path d="M3 5a2 2 0 012-2h1a1 1 0 010 2H5v7h2l1 2h4l1-2h2V5h-1a1 1 0 110-2h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
    </svg>
  )
  export const SignIn = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
        clipRule="evenodd"
      />
    </svg>
  )
  export const HandDrawnRightArrow = () => (
    <svg
      fill="currentColor"
      version="1.1"
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 346.566 450"
    >
      <g>
        <g>
          <path
            d="M19.78,223.774c-4.284-3.061-11.016,1.224-15.3-2.448c-2.448-1.836-6.12,1.224-3.672,3.672
			c2.448,2.448,4.896,3.06,7.956,3.672s7.956,1.836,11.016,0C21.616,227.446,21.616,224.998,19.78,223.774z"
          />
          <path
            d="M66.292,226.834c-3.06-1.224-6.12-0.612-9.18,0c-3.672,0-6.732,0.612-10.404,0.612c-3.06,0-3.06,4.284,0,4.284
			c3.672,0.611,6.732,0.611,10.404,0.611c3.06,0,6.732,0.612,9.18,0C68.74,231.118,68.74,228.058,66.292,226.834z"
          />
          <path
            d="M114.028,223.774c-7.956-1.225-14.688,3.06-22.644,3.672c-2.448,0-2.448,3.672,0,3.672c3.06,0,6.732-0.612,9.792-0.612
			c4.284-0.611,8.568-0.611,12.852-1.836C116.476,228.67,116.476,224.386,114.028,223.774z"
          />
          <path
            d="M156.255,211.534c-3.06,1.224-4.896,4.284-7.344,6.12s-4.896,3.06-7.956,3.672c-2.448,0.612-1.224,3.672,0.612,3.672
			c3.06,0.612,6.12-0.612,9.18-1.836c3.06-1.836,7.344-4.896,8.568-7.956C160.54,212.758,158.704,210.31,156.255,211.534z"
          />
          <path
            d="M191.139,170.53c-3.06,1.836-3.672,4.896-4.896,7.956c-1.836,4.284-4.896,7.956-7.344,11.628
			c-1.836,1.836,0.611,4.896,3.06,3.06c3.061-3.06,6.12-6.12,8.568-9.18c1.836-3.06,5.508-7.344,4.896-11.016
			C194.812,171.142,192.975,169.306,191.139,170.53z"
          />
          <path
            d="M200.931,133.81c-0.611-2.448-4.896-2.448-4.896,0c-1.224,6.732,0.612,12.852-2.448,18.972
			c-0.612,1.836,1.836,3.06,3.061,1.224C199.707,148.498,202.155,141.154,200.931,133.81z"
          />
          <path
            d="M188.691,85.462c-1.836-3.672-7.345-0.612-5.508,3.06c2.447,5.508,6.119,11.016,7.344,17.136c0,2.448,3.672,2.448,3.672,0
			C194.812,98.926,192.363,91.582,188.691,85.462z"
          />
          <path
            d="M166.047,73.222c-1.836-3.672-4.284-6.732-7.956-8.568c-3.06-1.836-8.568-4.284-11.628-1.224
			c-1.224,1.224-1.224,3.06,0,3.672c1.836,1.836,5.508,1.224,7.956,1.836c3.672,1.224,6.12,3.672,7.956,6.732
			C163.6,78.73,167.271,76.282,166.047,73.222z"
          />
          <path
            d="M116.476,59.758c-3.672,0-7.956,0.612-11.628,1.836c-1.836,0.612-3.06,3.06-1.224,4.896
			c1.224,1.224,4.896,1.224,6.732,0.612c1.224,0,1.836-1.224,1.836-2.448c1.224-0.612,3.06-0.612,4.284-0.612
			C119.536,64.042,119.536,59.758,116.476,59.758z"
          />
          <path
            d="M81.592,81.79c-4.896,0-9.18,1.224-12.24,4.284c-1.836,1.836-3.06,3.672-3.672,5.508c-1.224,2.448-3.06,5.508-3.06,7.956
			s3.672,4.896,5.508,2.448c2.448-2.448,3.06-7.344,4.896-10.404c1.836-3.672,4.896-4.896,8.568-5.508
			C84.04,86.074,84.651,82.402,81.592,81.79z"
          />
          <path
            d="M67.516,127.078c-4.284,4.284-4.284,10.404-4.896,15.912c0,1.224,0.612,2.448,1.836,3.06c1.224,0.612,1.836,0.612,3.06,0
			c1.224-0.612,1.836-1.836,1.836-3.06c-0.612-4.284-1.224-9.792,1.836-13.464C71.8,127.69,69.352,125.242,67.516,127.078z"
          />
          <path
            d="M75.472,178.486c-0.612-3.061-1.224-6.12-1.836-9.18c0-1.836-3.06-1.836-3.06,0c-0.612,3.672-1.224,7.344-0.612,11.016
			c0,3.06,1.224,7.344,4.896,7.956c1.836,0,3.672-0.612,3.672-2.448C77.919,182.771,76.083,180.935,75.472,178.486z"
          />
          <path
            d="M98.728,215.206c-4.896-4.284-11.628-7.344-12.852-14.076c0-1.836-3.06-1.836-3.06,0c0,7.344,6.732,15.912,13.464,17.748
			C98.728,219.49,100.563,217.042,98.728,215.206z"
          />
          <path
            d="M142.792,246.418c-5.508-3.672-12.852-6.12-18.972-9.18c-2.448-1.225-4.284,1.836-1.836,3.06
			c6.12,3.672,12.24,7.956,19.584,10.404C143.404,251.926,145.24,247.642,142.792,246.418z"
          />
          <path
            d="M196.035,246.418c-7.344-2.448-17.136,0-23.868,3.672c-2.448,1.225-0.612,4.896,1.835,4.284
			c7.344-3.06,14.688-1.224,22.032-3.06C197.871,250.09,197.871,247.03,196.035,246.418z"
          />
          <path
            d="M251.728,242.134c-3.061,0.612-6.12,1.836-9.792,2.448c-3.061,0.612-6.12,1.224-9.181,1.836
			c-1.836,0.612-1.836,3.061,0,3.672c7.345,1.225,15.3,1.836,21.42-3.06C257.235,245.194,254.175,241.522,251.728,242.134z"
          />
          <path
            d="M299.463,242.746c-2.448,0-4.896,1.224-7.344,1.836c-3.672,0.612-7.344-0.612-10.404-1.836
			c-3.06-1.224-4.896,3.672-1.836,4.896c6.12,3.061,17.137,5.509,22.032,0C303.135,245.806,302.523,242.134,299.463,242.746z"
          />
          <path
            d="M344.751,237.85c-6.731-5.508-14.076-10.403-20.808-15.3c-6.732-4.896-14.688-12.24-22.645-14.076
			c-3.672-0.611-7.956,3.061-5.508,7.345c3.672,5.508,9.792,8.567,15.3,12.239c6.732,4.284,13.464,9.181,19.584,13.465
			c-17.748,12.239-36.72,23.867-52.632,38.556c-3.06,3.06,1.224,8.568,4.896,6.12c19.584-14.076,40.392-26.928,61.199-39.168
			C346.587,245.194,347.812,240.298,344.751,237.85z"
          />
        </g>
      </g>
    </svg>
  )
  export const HandDrawnUpArrow = () => (
    <svg
      fill="currentColor"
      version="1.1"
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 339.193 339.193"
    >
      <g>
        <g>
          <path
            d="M170.71,303.132c-1.836-2.448-4.896-2.448-6.732,0c-3.06,3.672-1.836,7.956-1.836,12.853
			c0,6.12-0.612,12.239-1.836,18.359c-1.224,4.896,6.12,6.732,7.956,2.448c1.837-4.896,3.061-10.404,3.673-15.912
			C172.547,314.76,174.383,308.028,170.71,303.132z"
          />
          <path
            d="M171.322,277.428c-1.224-3.672-1.836-6.731-2.449-10.403c0-1.836,0.612-3.672,0-5.509
			c-0.612-1.836-0.612-3.06-1.835-4.896c-1.224-2.448-5.508-2.448-6.732,0c-1.836,4.284-1.836,7.344-0.612,11.628
			s1.836,7.956,4.284,12.24C166.426,284.16,172.547,281.712,171.322,277.428z"
          />
          <path
            d="M167.038,202.152c-1.224-1.836-4.284-1.836-6.12,0c-2.448,3.06-1.836,5.508-1.836,9.18s0.612,6.732,0.612,10.404
			c0.612,4.896,7.344,4.896,7.344,0c0-3.061,0.612-6.12,0.612-9.181C168.874,208.884,170.099,205.824,167.038,202.152z"
          />
          <path
            d="M167.65,174.612c-2.448-6.732-1.224-13.464-3.06-20.196c-1.224-3.672-6.732-3.672-7.956,0
			c-2.448,7.344,0,15.912,4.284,22.645C162.754,180.732,168.874,178.284,167.65,174.612z"
          />
          <path
            d="M163.366,96.276c-1.224-1.224-3.672-1.224-4.896,0c-3.672,3.672-2.448,8.568-2.448,13.464c0,4.284,0,9.18,0.612,13.464
			c0.612,3.672,6.732,3.672,7.344,0c0.612-4.284,0.612-7.956,0.612-12.24C165.814,106.068,167.038,100.56,163.366,96.276z"
          />
          <path
            d="M157.246,43.644c-3.672,0-6.12,3.672-4.896,6.732c1.224,4.896,1.224,11.016,1.836,15.912c0.612,3.06,6.12,3.06,6.732,0
			c0.612-5.508,0-11.016,1.836-15.912C163.366,47.316,160.918,43.644,157.246,43.644z"
          />
          <path
            d="M215.387,41.196c-14.076-15.3-29.376-30.6-48.349-40.392c-2.448-1.224-5.508-1.224-7.344,1.224
			c-12.852,15.3-22.644,32.436-36.108,47.124c-4.896,4.896,3.06,12.24,7.344,7.344c12.24-13.464,21.42-29.376,33.66-42.84
			c15.912,9.792,26.929,23.868,41.005,36.72C212.326,56.496,220.895,47.316,215.387,41.196z"
          />
        </g>
      </g>
    </svg>
  )
  export const CircledPlus = () => (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
  export const Tick = () => (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
    </svg>
  )
  export const CircledTick = () => (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
  export const RightArrow = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  )
  export const Info = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.696-3.534c.63 0 1.332-.288 2.196-1.458l.911-1.22a.334.334 0 0 0-.074-.472.38.38 0 0 0-.505.06l-1.475 1.679a.241.241 0 0 1-.279.061.211.211 0 0 1-.12-.244l1.858-7.446a.499.499 0 0 0-.575-.613l-3.35.613a.35.35 0 0 0-.276.258l-.086.334a.25.25 0 0 0 .243.312h1.73l-1.476 5.922c-.054.234-.144.63-.144.918 0 .666.396 1.296 1.422 1.296zm1.83-10.536c.702 0 1.242-.414 1.386-1.044.036-.144.054-.306.054-.414 0-.504-.396-.972-1.134-.972-.702 0-1.242.414-1.386 1.044a1.868 1.868 0 0 0-.054.414c0 .504.396.972 1.134.972z"
        fill="#000000"
      />
    </svg>
  )
  export const Plus = () => (
    <svg fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path
        d="M12,0C5.38,0,0,5.38,0,12c0,6.62,5.38,12,12,12c6.62,0,12-5.38,12-12C24,5.38,18.62,0,12,0z M12,22C6.49,22,2,17.51,2,12
	C2,6.49,6.49,2,12,2c5.51,0,10,4.49,10,10C22,17.51,17.51,22,12,22z M20,11v2h-7v7h-2v-7H4v-2h7V4h2v7H20z"
      />
    </svg>
  )
  export const Download = () => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
      <path
        d="M3,12.3v7a2,2,0,0,0,2,2H19a2,2,0,0,0,2-2v-7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <g>
        <polyline
          data-name="Right"
          fill="none"
          id="Right-2"
          points="7.9 12.3 12 16.3 16.1 12.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <line
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          x1="12"
          x2="12"
          y1="2.7"
          y2="14.2"
        />
      </g>
    </svg>
  )
  export const Cross = () => (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  )
  export const Briefcase = () => (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
      ></path>
    </svg>
  )
  export const MapPin = () => (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
      ></path>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      ></path>
    </svg>
  )
}

export namespace Form {
  export const Select = FlowbiteSelect
  export const Label = FlowbiteLabel
  export const Checkbox = FlowbiteCheckbox

  type ToggleProps = {
    className?: string
    id: number
    defaultChecked: boolean
    label: string
  }
  const _Toggle = (
    { className, id, defaultChecked, label }: ToggleProps,
    ref: ForwardedRef<HTMLInputElement>
  ) => (
    <p className={className}>
      <label
        htmlFor={id.toString()}
        className="relative mb-4 inline-flex cursor-pointer items-center"
      >
        <input
          className="peer sr-only"
          ref={ref}
          type="checkbox"
          name="items"
          value={id}
          id={id.toString()}
          // if the user has already made a selection then the list will be prefilled with that data
          // otherwise all will be marked by default
          defaultChecked={defaultChecked}
        />
        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800" />
        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">{label}</span>
      </label>
    </p>
  )
  export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(_Toggle)

  export const TextInput = ({
    id,
    label,
    defaultValue,
    placeholder,
    minLength,
    className,
    required,
  }: {
    id: string
    label: string
    defaultValue?: string
    placeholder?: string
    minLength?: number
    className?: string
    required?: boolean
  }) => (
    <p className={className}>
      <FlowbiteLabel className="mb-2 inline-block" htmlFor={id}>
        {label}
      </FlowbiteLabel>
      <FlowbiteTextInput
        name={id}
        id={id}
        minLength={minLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
    </p>
  )

  export const TextArea = ({
    id,
    label,
    rows,
    defaultValue,
    placeholder,
    minLength,
    className,
    required,
  }: {
    id: string
    label: string
    rows?: number
    defaultValue?: string
    placeholder?: string
    minLength?: number
    className?: string
    required?: boolean
  }) => (
    <p className={className}>
      <FlowbiteLabel className="mb-2 inline-block" htmlFor={id}>
        {label}
      </FlowbiteLabel>
      <FlowbiteTextArea
        name={id}
        id={id}
        minLength={minLength}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
    </p>
  )

  export const Legend = ({ children, className }: HTMLAttributes<HTMLLegendElement>) => (
    <legend
      className={multipleClasses(
        className,
        "font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl"
      )}
    >
      {children}
    </legend>
  )

  export const Fieldset = ({
    children,
    className,
  }: FieldsetHTMLAttributes<HTMLFieldSetElement>) => (
    <fieldset
      className={multipleClasses(
        className,
        "m-auto w-full rounded-lg bg-white p-6 pt-5 shadow dark:border dark:border-gray-700 dark:bg-gray-800 md:mt-0"
      )}
    >
      {children}
    </fieldset>
  )
  export function ImageInput({
    label,
    id,
    helper,
    required,
  }: {
    label: string
    id: string
    helper?: ReactNode
    required?: boolean
  }) {
    const [error, setError] = useState(false)

    const handleFileInput: ChangeEventHandler<HTMLInputElement> = event => {
      event.preventDefault()
      const files = event.target.files
      if (!files || files.length === 0) return
      const extension = files[0].name.split(".").pop()
      if (!extension || (extension !== "jpg" && extension !== "jpeg" && extension !== "png")) {
        // Todo check dimensions of image
        event.target.value = ""
        return setError(true)
      } else setError(false)
    }

    return (
      <p>
        <FlowbiteLabel className="mb-2 inline-block" htmlFor={id}>
          {label}
        </FlowbiteLabel>
        <FileInput
          id={id}
          name={id}
          required={required}
          onChange={handleFileInput}
          color={error ? "failure" : undefined}
          helperText={helper}
        />
      </p>
    )
  }
}
