/** Services */
import { useServerURL } from "@/services/config"

export const fetchSeries = async ({ table, period, column, from, to }) => {
	try {
		const url = new URL(`${useServerURL()}/stats/series/${table}/${period}`)

		if (column) url.searchParams.append("column", column)
		if (from) url.searchParams.append("from", from)
		if (to) url.searchParams.append("to", to)

		const data = await fetch(url.href).then((r) => r.json())
		return data
	} catch (error) {
		console.error(error)
	}
}

export const fetchPrice = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/fraxprice/current`)

		const data = await fetch(url.href).then((r) => r.json())
		console.log("fetchPrice :", data)
		return data
	} catch (error) {
		console.error(error)
	}
}

export const fetchPriceSeries = async ({ timeframe }) => {
	try {
		const url = new URL(`${useServerURL()}/api/fraxprice`)

		const data = await fetch(url.href).then((r) => r.json())
		console.log("fetchPriceSeries :", data)
		return data
	} catch (error) {
		console.error(error)
	}
}


export const fetchPriceETH = async () => {
	try {
		const url = new URL(`${useServerURL()}/api/ethprice/current`)

		const data = await fetch(url.href).then((r) => r.json())
		console.log("fetchPrice :", data)
		return data
	} catch (error) {
		console.error(error)
	}
}

export const fetchPriceSeriesETH = async ({ timeframe }) => {
	try {
		const url = new URL(`${useServerURL()}/api/ethprice`)

		const data = await fetch(url.href).then((r) => r.json())
		console.log("fetchPriceSeries :", data)
		return data
	} catch (error) {
		console.error(error)
	}
}

export const fetchGasPriceSeries = async ({ timeframe, from, to }) => {
	try {
		const url = new URL(`${useServerURL()}/api/gasprice`)

		const data = await fetch(url.href).then((r) => r.json())
		console.log("fetchGasPriceSeries :", data)
		return data
	} catch (error) {
		console.error(error)
	}
}

