export const views = {
    us_china_routes: {
        bbox: [-258.046875, 14.604847, -72.421875, 50.289339],
        layers: {
            shippingLanes: [
                { id: "us_china_north", color: "#ff6b35" },
                { id: "us_china_south", color: "#4ecdc4" },
            ],
            portLabels: "us_china",
            isAnimated: true,
        },
    },
    china_soy_chart_annual: {
        bbox: [-258.046875, 14.604847, -72.421875, 50.289339],
        overlay: true,
        layers: {
            shippingLanes: [
                { id: "us_china_north", color: "#ff6b35" },
            ],
            portLabels: "us_china",
        },
    },
    china_soy_chart_annual: {
        bbox: [-74.882813, -50.928141, 135.770416, 37.198612],
        layers: {
            shippingLanes: [
                { id: "latam_china", color: "#ff6b35" },
            ],
        },
    },
    latam_china_chart_monthly: {
        bbox: [-74.882813, -50.928141, 135.770416, 37.198612],
        layers: {
            shippingLanes: [
                { id: "latam_china", color: "#ff6b35" },
            ],
        },
    },
    latam_ports: {
        bounds: "latam_ports",
        layers: {
            latam_ports: true,
        },
    },
    port_of_santos: {
        center: [-46.3021, -23.9655], // Port of Santos, Brazil
        zoom: 15,
        pitch: 0,
        bearing: 0,
        basemap: "satellite",
        layers: {
            latam_ports: true,
            animatedPortLabel: {
                coordinates: [-46.3021, -23.9655],
                name: "Port of Santos",
                offset: [0, 0.006], // Offset in degrees [lon, lat] - shortened line
            },
        },
    },
    santos_gateway: {
        bbox: [-74.882813, -50.928141, 135.770416, 37.198612],
        layers: {
            shippingLanes: [
                { id: "latam_china", color: "#ff6b35" },
            ],
            latam_ports: true,
            isAnimated: true,
        },
    },
    port_of_chancay: {
        center: [-77.2731, -11.5843], // Port of Chancay, Peru
        zoom: 15,
        pitch: 0,
        bearing: 0,
        basemap: "satellite",
        layers: {
            latam_ports: true,
            animatedPortLabel: {
                coordinates: [-77.2731, -11.5843],
                name: "Port of Chancay",
                offset: [0, 0.006], // Offset in degrees [lon, lat] - shortened line
            },
        },
    },
    china_latam_chancay_route: {
        bounds: "china_latam_chancay_route",
        layers: {
            shippingLanes: [
                { id: "china_latam_chancay_route", color: "#ff6b35" },
            ],
            isAnimated: true,
        },
    },
    china_latam_chancay_video: {
        src: "VIDEO-2025-08-28-12-10-10-700x700-bg.mp4",
    },
};