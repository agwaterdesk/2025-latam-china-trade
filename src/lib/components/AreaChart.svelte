<script>
    import * as d3 from "d3";
    import { fade } from "svelte/transition";
    import chinaFoodImports from "../data/china-food-imports-by-country.csv";
    import getValueFromCSSVar from "../utils/getValueFromCSSVar";

    let { activeId } = $props();

    // Parse all data
    const allData = chinaFoodImports.map((d) => ({
        ...d,
        value: +d.value,
        share: +d.share,
        year: +d.year,
    }));

    const usColor = getValueFromCSSVar("--color-theme-us");
    const latamColor = getValueFromCSSVar("--color-theme-latam");
    const otherColor = getValueFromCSSVar("--color-theme-other");

    // Get unique years and partners
    const years = [...new Set(allData.map((d) => d.year))].sort();
    const allPartners = [...new Set(allData.map((d) => d.partner))];

    // Determine which partners to show based on activeId
    const visiblePartners = $derived.by(() => {
        if (activeId === "us_china_chart") {
            return ["United States"];
        } else if (activeId === "latam_china_chart") {
            return allPartners;
        } else {
            return [];
        }
    });

    // Create color scale with custom scheme
    const getCountryColor = (partner) => {
        if (activeId === "us_china_chart") {
            // For US view: only US gets color, everything else is gray
            return partner === "United States" ? usColor : otherColor;
        } else if (activeId === "latam_china_chart") {
            // For Latin America view: US and Latin American countries get colors, others are gray
            if (partner === "United States") {
                return usColor; // Blue for US
            } else if (
                [
                    "Brazil",
                    "Argentina",
                    "Chile",
                    "Peru",
                    "Colombia",
                    "Mexico",
                    "Uruguay",
                    "Paraguay",
                    "Ecuador",
                    "Bolivia",
                    "Venezuela",
                ].includes(partner)
            ) {
                return latamColor; // Green for Latin American countries
            } else {
                return otherColor; // Gray for others
            }
        } else {
            // Default: everything gray
            return otherColor;
        }
    };

    // Chart dimensions
    const margin = { top: 90, right: 20, bottom: 40, left: 40 };
    let width = $state(400);
    let height = $state(300);
    const innerWidth = $derived(width - margin.left - margin.right);
    const innerHeight = $derived(height - margin.top - margin.bottom);

    // Create scales
    const xScale = $derived.by(() =>
        d3.scaleLinear().domain(d3.extent(years)).range([0, innerWidth]),
    );

    const yDomain = $derived.by(() => {
        // Calculate the sum of all countries for each year, then take the maximum
        const yearlyTotals = years.map((year) => {
            const yearData = allData.filter((d) => d.year === year);
            return d3.sum(yearData, (d) => d.share);
        });
        const maxTotal = d3.max(yearlyTotals);
        return [0, maxTotal];
    });

    const yScale = $derived.by(() => {
        return d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);
    });

    // Prepare data for stacked area chart using ALL partners
    const stackedData = $derived.by(() => {
        return d3
            .stack()
            .keys(allPartners)
            .value((d, key) => {
                const partnerData = d[key];
                return partnerData ? partnerData.share : 0;
            })(
            years.map((year) => {
                const yearData = {};
                allPartners.forEach((partner) => {
                    const dataPoint = allData.find(
                        (d) => d.year === year && d.partner === partner,
                    );
                    yearData[partner] = dataPoint || { share: 0 };
                });
                yearData.year = year;
                return yearData;
            }),
        );
    });

    // Create area generator
    const area = $derived.by(() => {
        return d3
            .area()
            .x((d) => xScale(d.data.year))
            .y0((d) => yScale(d[0]))
            .y1((d) => yScale(d[1]))
            .curve(d3.curveMonotoneX);
    });

    // Create initial area generator for animation (all areas start at bottom)
    const initialArea = $derived.by(() => {
        return d3
            .area()
            .x((d) => xScale(d.data.year))
            .y0((d) => yScale(0))
            .y1((d) => yScale(0))
            .curve(d3.curveMonotoneX);
    });

    // Generate path data for each area
    const areaPaths = $derived.by(() => {
        return stackedData.map((d) => ({
            key: d.key,
            path: area(d),
            fill: getCountryColor(d.key),
            isHighlighted: visiblePartners.includes(d.key),
        }));
    });

    // Generate axis data
    const xAxisData = $derived.by(() => {
        return years.map((year) => ({
            value: year,
            x: xScale(year),
        }));
    });

    const yAxisData = $derived.by(() => {
        const ticks = yScale.ticks(5);
        return ticks.map((tick) => ({
            value: tick,
            y: yScale(tick),
            label: d3.format(".0%")(tick),
        }));
    });

    // Title text
    const titleText = $derived.by(() => {
        return activeId === "us_china_chart"
            ? "US Share of China Food Imports"
            : "China Food Import Shares by Country";
    });

    // Legend data
    const legendData = $derived.by(() => {
        return visiblePartners.slice(0, 6).map((partner, i) => ({
            partner,
            color: getCountryColor(partner),
            y: i * 18,
        }));
    });

    // Trump administration overlay data
    const trumpOverlay = $derived.by(() => {
        const startYear = 2016;
        const endYear = 2020;
        const startX = xScale(startYear);
        const endX = xScale(endYear);
        const width = endX - startX;

        return {
            x: startX,
            width: width,
            label: "First Trump administration",
        };
    });

    const showTrumpOverlay = $derived.by(() => {
        return activeId === "us_china_chart" && trumpOverlay.width > 0;
    });
</script>

<div
    class="area-chart-container"
    bind:clientWidth={width}
    bind:clientHeight={height}
    transition:fade
>
    <svg {width} {height}>
        <g transform="translate({margin.left},{margin.top})">
            <!-- Areas -->
            {#each areaPaths as areaPath}
                <path
                    class="area"
                    class:highlighted={areaPath.isHighlighted}
                    d={areaPath.path}
                    fill={areaPath.fill}
                    style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));"
                />
            {/each}

            <!-- X Axis -->
            <g class="axis axis-x" transform="translate(0,{innerHeight})">
                {#each xAxisData as tick (tick.value)}
                    <g transform="translate({tick.x},0)">
                        <line y2="6" stroke="#e5e7eb" stroke-width="1" />
                        <text
                            y="9"
                            dy="0.71em"
                            text-anchor="middle"
                            style="font-size: 11px; font-weight: 500; fill: {otherColor};"
                        >
                            {tick.value}
                        </text>
                    </g>
                {/each}
            </g>

            <!-- Y Axis -->
            <g class="axis axis-y">
                {#each yAxisData as tick (tick.value)}
                    <g transform="translate(0,{tick.y})">
                        <line
                            x2="-{innerWidth}"
                            stroke="#f3f4f6"
                            stroke-width="1"
                        />
                        <text
                            x="-8"
                            dy="0.32em"
                            text-anchor="end"
                            style="font-size: 11px; font-weight: 500; fill: {otherColor};"
                        >
                            {tick.label}
                        </text>
                    </g>
                {/each}
            </g>

            <!-- Trump Administration Overlay -->

            <g
                class="trump-overlay-container"
                opacity={showTrumpOverlay ? 1 : 0}
            >
                <rect
                    class="trump-overlay"
                    x={trumpOverlay.x}
                    y="0"
                    width={trumpOverlay.width}
                    height={innerHeight}
                />

                <line
                    x1={trumpOverlay.x}
                    x2={trumpOverlay.x}
                    y1="0"
                    y2={innerHeight}
                    class="trump-overlay-line"
                />

                <line
                    x1={trumpOverlay.x + trumpOverlay.width}
                    x2={trumpOverlay.x + trumpOverlay.width}
                    y1="0"
                    y2={innerHeight}
                    class="trump-overlay-line"
                />

                <text
                    class="trump-label"
                    x={trumpOverlay.x + trumpOverlay.width / 2}
                    y={innerHeight / 2}
                >
                    {trumpOverlay.label}
                </text>
            </g>
        </g>

        <!-- Title -->
        <text class="chart-title" x={width / 2} y={margin.top - 30}>
            Share of China food imports, by top 10 countries
        </text>

        <!-- Legend -->
        <!-- {#if legendData.length > 0}
            <g class="legend" transform="translate({width - 120}, 40)">
                {#each legendData as item, i (item.partner)}
                    <g class="legend-item" transform="translate(0, {item.y})">
                        <rect
                            width="14"
                            height="14"
                            rx="2"
                            fill={item.color}
                            style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));"
                        />
                        <text
                            x="20"
                            y="10"
                            style="font-size: 11px; font-weight: 500; fill: #374151;"
                        >
                            {item.partner}
                        </text>
                    </g>
                {/each}
            </g>
        {/if} -->
    </svg>
</div>

<style lang="scss">
    .chart-title {
        font-size: 24px;
        font-weight: 600;
        fill: var(--color-gray-1000);
        font-family: var(--font-heading);
        text-anchor: middle;
    }

    .area-chart-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        background: #fff;
        z-index: 1000;
        box-sizing: border-box;
        border-radius: 12px;
        box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);

        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    svg {
        display: block;
        border-radius: 8px;
    }

    .area {
        stroke: rgba(255, 255, 255, 0.8);
        stroke-width: 1.5;
        transition: fill 0.3s ease;
    }

    .trump-overlay-container {
        transition: opacity 0.3s ease;
        .trump-overlay {
            pointer-events: none;
            fill: var(--color-gray-100);
            stroke-width: 0;
            opacity: 0.25;
        }

        .trump-overlay-line {
            stroke: var(--color-gray-1000);
            stroke-width: 2;
            stroke-dasharray: 2, 2;
        }

        .trump-label {
            font-family: var(--font-body);
            pointer-events: none;
            font-size: 18px;
            font-weight: 500;
            fill: var(--color-gray-1000);
            font-style: italic;
            text-anchor: middle;
        }
    }

    .axis {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;

        &-x {
            text {
                font-size: 11px;
                font-weight: 500;
                fill: #cccccc;
            }

            .domain {
                stroke: #e5e7eb;
                stroke-width: 1;
            }

            .tick line {
                stroke: #e5e7eb;
                stroke-width: 1;
            }
        }

        &-y {
            text {
                font-size: 11px;
                font-weight: 500;
                fill: #cccccc;
            }

            .domain {
                stroke: #e5e7eb;
                stroke-width: 1;
            }

            .tick line {
                stroke: #f3f4f6;
                stroke-width: 1;
            }
        }
    }

    .legend {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
    }
</style>
