import { useAppStore } from "@/stores/app"

export const endpoints = {
	api: {
		mainnet: "http://localhost:5000",
	
	},
	wss: {
		mainnet: "ws://localhost:5000",
		
	},
}

export const useServerURL = () => {
	const appStore = useAppStore()

	switch (appStore.network) {
		case "mainnet":
			return endpoints.api.mainnet


		default:
			return endpoints.api.mainnet
	}
}

export const useSocketURL = () => {
	const appStore = useAppStore()

	switch (appStore.network) {
		case "mainnet":
			return endpoints.wss.mainnet



		default:
			return endpoints.wss.mainnet
	}
}
//http://localhost:5000
