library(tidyverse)
library(googlesheets4)

ss <- "https://docs.google.com/spreadsheets/d/1yO-PVi-sWz6DO6JXwogr0uRZfFOMbVB5rD5BY-XSv1A/edit?gid=722413559"

values <- read_sheet(ss, sheet="raw: china soy beans value")
share <- read_sheet(ss, sheet="raw: china soy beans share")


values_long <- values %>% 
  pivot_longer(
    cols = `2016`:`2024`,
    names_to = "year"
  ) %>% 
  filter(partner != "World")


share_long <- share %>% 
  pivot_longer(
    cols = `2016`:`2024`,
    names_to = "year",
    values_to = "share"
  )


df <- left_join(values_long, share_long) %>% 
  select(partner, value, share, year) %>% 
  filter(partner %in% c("United States", "Brazil"))

write_sheet(df, ss, sheet="chart: china_soy_imports_by_year")

# Monthly

monthly_raw <- read_sheet(ss, sheet="raw: monthly china soy beans")


monthly <- monthly_raw %>% 
  pivot_longer(
    cols = -partner,
    names_to = "month",
    values_to = "value"
  ) %>% 
  group_by(month) %>% 
  # grab the "World" value for that month
  mutate(
    world_value = value[partner == "World"][1],
    share = if_else(world_value > 0, value / world_value, NA_real_)
  ) %>% 
  ungroup() %>% 
  filter(partner %in% c("United States", "Brazil")) %>% 
  select(partner, month, value, share)

write_sheet(monthly, ss, sheet="chart: china_soy_imports_by_month")

