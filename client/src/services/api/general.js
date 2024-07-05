/** Services */
import { useServerURL } from "@/services/config"

export const fetchHead = async () => {
	try {
		const url = new URL(`${useServerURL()}/head`)

		const data = await fetch(url.href).then((r) => r.json())
		return data
	} catch (error) {
		console.error(error)
	}
}

export const fetchTps = async () => {
	try {
	  const url = new URL(`${useServerURL()}/api/tpm/statistics`); // Ensure the endpoint is correct
	  const response = await fetch(url.href);
  
	  if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	  }
  
	  const data = await response.json();
	  console.log("DATA", data); // Check if data is as expected
	  return data;
	} catch (error) {
	  console.error("Error fetching TPS:", error);
	}
  };