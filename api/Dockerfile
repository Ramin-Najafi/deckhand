FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["Deckhand.Api/Deckhand.Api.csproj", "Deckhand.Api/"]
COPY ["Deckhand.Tests/Deckhand.Tests.csproj", "Deckhand.Tests/"]
RUN dotnet restore "Deckhand.Api/Deckhand.Api.csproj"
RUN dotnet restore "Deckhand.Tests/Deckhand.Tests.csproj"

COPY . .

# Run tests
WORKDIR "/src/Deckhand.Tests"
RUN dotnet test

WORKDIR "/src/Deckhand.Api"
RUN dotnet build "Deckhand.Api.csproj" -c Release -o /app/build
RUN dotnet publish "Deckhand.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Deckhand.Api.dll"]
