import { useAppStore } from "@/stores/app"

export const endpoints = {
	api: {
		mainnet: "http://avq4fl61598crd1l0vpec3dd3s.ingress.us-west.spheron.wiki",
	
	},
	wss: {
		mainnet: "ws://avq4fl61598crd1l0vpec3dd3s.ingress.us-west.spheron.wiki",
		
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
