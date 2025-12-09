import getValueFromCSSVar from "./getValueFromCSSVar";

const usColor = getValueFromCSSVar("--color-theme-us");
const latamColor = getValueFromCSSVar("--color-theme-latam");
const chinaColor = getValueFromCSSVar("--color-theme-china");
const brazilColor = getValueFromCSSVar("--color-theme-brazil");

export const views = {
    us_china_routes: {
        bbox: [-258.046875, 14.604847, -72.421875, 50.289339],
        layers: {
            shippingLanes: [
                { id: "us_china_north", color: usColor },
                { id: "us_china_south", color: usColor },
            ],
            ports: [
                {
                    name: "Gulf Coast export terminals",
                    coordinates: [-89.799323, 29.344631],
                    color: usColor,
                },
                {
                    name: "Pacific Northwest export terminals",
                    coordinates: [-124.835138, 48.484726],
                    color: usColor,
                },
                {
                    name: "Southern China ports",
                    coordinates: [114.391855, 22.26097],
                    color: chinaColor,
                },
                {
                    name: "Northern China ports",
                    coordinates: [117.9907, 38.834611],
                    color: chinaColor,
                },
            ],
            isAnimated: true,
        },
    },
    latam_ports: {
        bounds: "latam_ports",
        layers: {
            latam_ports: true,
        },
    },
    china_soy_chart_annual: {
        bounds: "latam_ports",
    },

    latam_china_chart_monthly: {
        bounds: "latam_ports",
    },

    port_of_santos: {
        center: [-46.29354197127584, -23.968613317870194],
        zoom: 13,
        pitch: 0,
        bearing: 0,
        duration: 3000,
        direction: "forward",
        basemap: "satellite",
        layers: {
            animatedPortLabel: {
                coordinates: [-46.29354197127584, -23.968613317870194],
                name: "Port of Santos",
                offset: [0, 0.006],
                markerColor: getValueFromCSSVar("--color-theme-brazil"),
            },
        },
    },
    port_of_santos_video: {
        center: [-46.29354197127584, -23.968613317870194],
        zoom: 15
    },
    santos_gateway: {
        bbox: [-74.882813, -50.928141, 135.770416, 37.198612],
        layers: {
            shippingLanes: [
                { id: "santos_china", color: brazilColor },
            ],
            ports: [

                {
                    name: "Port of Santos",
                    coordinates: [-46.29354197127584, -23.968613317870194],
                    color: brazilColor,
                },
                {
                    name: "Shanghai",
                    coordinates: [121.4811671393545, 31.2317060958153],
                    color: chinaColor,
                },

            ],
            isAnimated: true,
        },
    },
    port_of_chancay: {
        center: [-77.2731, -11.5843], // Port of Chancay, Peru
        zoom: 13,
        duration: 3000,
        basemap: "satellite",
        layers: {
            animatedPortLabel: {
                coordinates: [-77.2731, -11.5843],
                name: "Port of Chancay",
                offset: [0, 0.006], // Offset in degrees [lon, lat] - shortened line
                markerColor: getValueFromCSSVar("--color-theme-peru"),
            },
        },
    },
    china_latam_chancay_route: {
        bbox: [-251.398773, -38.615797, -52.062836, 51.782285],
        layers: {
            shippingLanes: [
                { id: "latam_china_old", color: getValueFromCSSVar("--color-theme-brazil") },
                { id: "latam_china_new", color: getValueFromCSSVar("--color-theme-peru") },
            ],
            isAnimated: true,
            ports: [
                {
                    name: "Shanghai",
                    coordinates: [121.4811671393545, 31.2317060958153],
                    color: chinaColor,
                },
                {
                    name: "Port of Chancay",
                    coordinates: [-77.2731, -11.5843],
                    color: getValueFromCSSVar("--color-theme-peru"),
                },
                {
                    name: "Manaus",
                    coordinates: [-59.98846226806313, -3.039817325221312],
                    color: brazilColor,
                },

            ],
        },
    },
    farmer_vide0: {
        bbox: [-251.398773, -38.615797, -52.062836, 51.782285],
    }
};